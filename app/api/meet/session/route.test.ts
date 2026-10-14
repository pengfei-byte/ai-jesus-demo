import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetLimits } from "@/lib/rate-limit";
import { POST } from "./route";

function call() {
  return POST(
    new Request("http://localhost/api/meet/session", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.9" },
      body: JSON.stringify({ name: "Anna", hope: "peace", portrait: "Anna came for peace." }),
    }),
  );
}

describe("POST /api/meet/session", () => {
  beforeEach(() => {
    resetLimits();
    delete process.env.REVERIE_API_KEY;
    delete process.env.REVERIE_BASE_URL;
    delete process.env.RENDER_EXTERNAL_URL;
    vi.restoreAllMocks();
  });

  it("returns live false without a key", async () => {
    const response = await call();
    expect(await response.json()).toEqual({ live: false });
  });

  it("asks Reverie for a three-minute Jesus session and hides the key", async () => {
    process.env.REVERIE_API_KEY = "reverie-test-key";
    process.env.RENDER_EXTERNAL_URL = "https://ai-jesus-demo.onrender.com";
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          credentials: { control_url: "wss://example/public/v1/realtime", control_token: "short-token", session_id: "s1", ice_servers: [] },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const response = await call();
    const body = await response.json();
    const firstCall = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit] | undefined;
    const sent = JSON.parse(String(firstCall?.[1]?.body));
    expect(firstCall?.[0]).toBe("https://api.reverie-ai.com/api/public/v1/connections");
    expect(sent.model).toBe("r2-realtime-v1");
    expect(sent.limits.max_duration_ms).toBe(180000);
    expect(sent.credentials_ttl_ms).toBe(240000);
    expect(sent.character.name).toBe("Jesus");
    expect(sent.seed_image_url).toBe("https://ai-jesus-demo.onrender.com/jesus-reference.jpg");
    expect(sent.character.reference_image).toBeUndefined();
    expect(sent.scene.prompt).toContain("morning linen");
    expect(body.live).toBe(true);
    expect(body.credentials.control_token).toBe("short-token");
    expect(JSON.stringify(body)).not.toContain("reverie-test-key");
  });
});
