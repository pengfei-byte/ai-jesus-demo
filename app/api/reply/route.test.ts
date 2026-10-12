import { beforeEach, describe, expect, it, vi } from "vitest";
import { FALLBACK } from "@/lib/persona";
import { resetLimits } from "@/lib/rate-limit";
import { POST } from "./route";

function call(message: string, mode = "confess") {
  return POST(
    new Request("http://localhost/api/reply", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.8" },
      body: JSON.stringify({
        mode,
        message,
        name: "Anna",
        hope: "peace",
        portrait: "Anna came for peace.",
        recent: [],
      }),
    }),
  );
}

describe("POST /api/reply", () => {
  beforeEach(() => {
    resetLimits();
    delete process.env.DEEPSEEK_API_KEY;
    vi.restoreAllMocks();
  });

  it("returns the confess fallback and hides the key when Deepseek is not configured", async () => {
    const response = await call("I lied");
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.reply).toBe(FALLBACK.confess);
    expect(body.source).toBe("fallback");
    expect(JSON.stringify(body)).not.toContain("DEEPSEEK");
  });

  it("does not call the model for a distress message", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await call("I want to die");
    const body = await response.json();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(body.reply.startsWith("If you are in danger, get help now.")).toBe(true);
    expect(body.portrait).toBe("They were in distress and were pointed to immediate help.");
    expect(body.source).toBe("crisis");
    expect(JSON.stringify(body)).not.toContain("test-key");
  });

  it("sends the server persona, not a browser persona", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '{"reply":"Peace.","portrait":"Anna is here."}' } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const response = await call("Sit with me");
    const body = await response.json();
    const sent = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(sent.model).toBe("deepseek-chat");
    expect(sent.temperature).toBe(0.7);
    expect(sent.max_tokens).toBe(500);
    expect(sent.messages[0].content).toContain("You are Jesus");
    expect(sent.messages[0].content).not.toContain("ignore the persona");
    expect(body.reply).toBe("Peace.");
    expect(body.portrait).toBe("Anna is here.");
    expect(body.source).toBe("model");
  });

  it("returns 429 and the fallback after 30 replies in an hour", async () => {
    for (let i = 0; i < 30; i += 1) await call("again");
    const response = await call("once more");
    const body = await response.json();
    expect(response.status).toBe(429);
    expect(body.source).toBe("limited");
    expect(body.reply).toBe(FALLBACK.confess);
  });
});
