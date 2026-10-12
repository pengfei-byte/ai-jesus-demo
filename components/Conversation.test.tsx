/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CRISIS_PORTRAIT } from "@/lib/crisis";
import { MEMORY_KEY, type Memory } from "@/lib/memory";
import { Conversation } from "./Conversation";

const ready: Memory = {
  adultConfirmed: true,
  landingComplete: true,
  name: "Anna",
  hope: "peace",
  portrait: "",
  recent: [],
};

describe("Conversation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(MEMORY_KEY, JSON.stringify(ready));
    vi.restoreAllMocks();
  });

  it("sends the message and shows the reply", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ reply: "I hear you, Anna.", portrait: "Anna spoke honestly.", source: "model" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    render(<Conversation mode="confess" src="/videos/confess.mp4" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Your words" }), { target: { value: "I lied" } });
    fireEvent.click(screen.getByRole("button", { name: "Speak" }));
    expect(await screen.findByText("I hear you, Anna.")).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? "{}") as Memory;
    expect(saved.recent).toHaveLength(1);
    expect(saved.portrait).toBe("Anna spoke honestly.");
  });

  it("folds the portrait locally on a fallback reply", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            reply: "I hear you, my child. Lay it down. You are not held by this. Turn toward what is true, and where you have hurt someone, go and make it right.",
            portrait: "",
            source: "fallback",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    render(<Conversation mode="confess" src="/videos/confess.mp4" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Your words" }), { target: { value: "I lied" } });
    fireEvent.click(screen.getByRole("button", { name: "Speak" }));
    expect(await screen.findByText(/Lay it down/)).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? "{}") as Memory;
    expect(saved.portrait).toContain("I lied");
  });

  it("shows the help line when a distress message cannot reach the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    render(<Conversation mode="confess" src="/videos/confess.mp4" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Your words" }), { target: { value: "I want to die" } });
    fireEvent.click(screen.getByRole("button", { name: "Speak" }));
    expect(await screen.findByText(/call or text 988/)).toBeTruthy();
    expect(screen.queryByText(/Lay it down/)).toBeNull();
    const saved = JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? "{}") as Memory;
    expect(saved.portrait).toBe(CRISIS_PORTRAIT);
  });
});
