/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MEMORY_KEY, type Memory } from "@/lib/memory";
import { Meet } from "./Meet";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const ready: Memory = {
  adultConfirmed: true,
  landingComplete: true,
  name: "Anna",
  hope: "peace",
  portrait: "",
  recent: [],
};

class FakeSocket {
  static readonly OPEN = 1;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  constructor(
    public url: string,
    public protocols: string[],
  ) {}
  send(body: string) {
    this.sent.push(body);
  }
  close() {
    this.readyState = 3;
  }
}

class FakePeer {
  iceGatheringState = "complete";
  ontrack: (() => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  addTransceiver() {}
  close() {}
}

describe("Meet", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(MEMORY_KEY, JSON.stringify(ready));
    vi.stubGlobal("WebSocket", FakeSocket);
    vi.stubGlobal("RTCPeerConnection", FakePeer);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              live: true,
              credentials: {
                control_url: "wss://example.test/control",
                control_token: "token",
                session_id: "session",
                ice_servers: [],
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    );
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop() {} }] })) },
    });
  });

  it("lets Jesus speak first by name, then keeps only the latest round", async () => {
    render(<Meet />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    const greeting = (await screen.findByText(/Anna/)).textContent ?? "";
    expect(greeting).toContain("Anna");
    expect(screen.queryByText(/I just sat down/)).toBeNull();
    expect(screen.queryByText(/exactly these words/)).toBeNull();

    fireEvent.change(screen.getByRole("textbox", { name: "Your words" }), { target: { value: "I am tired" } });
    fireEvent.click(screen.getByRole("button", { name: "Speak" }));
    expect(screen.queryByText(greeting)).toBeNull();
    expect(screen.getByText("I am tired").className).toContain("you");
    expect(screen.getByText(/Jesus is replying/)).toBeTruthy();
  });
});
