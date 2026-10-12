import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTurnText, attachLocalPreview, openJesusStream, type MeetCredentials } from "./meet-media";

describe("attachLocalPreview", () => {
  it("shows the camera locally and does not send a track", () => {
    const video = { srcObject: null as unknown };
    const stream = { id: "local" };
    const pc = { addTrack: vi.fn() };
    attachLocalPreview(video, stream, pc);
    expect(video.srcObject).toBe(stream);
    expect(pc.addTrack).not.toHaveBeenCalled();
  });
});

class FakeSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static latest: FakeSocket | null = null;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  constructor(
    public url: string,
    public protocols: string[],
  ) {
    FakeSocket.latest = this;
  }
  send(body: string) {
    if (this.readyState !== 1) throw new Error("InvalidStateError");
    this.sent.push(body);
  }
  close() {
    this.readyState = 3;
  }
}

class FakePeer {
  static latest: FakePeer | null = null;
  iceGatheringState = "complete";
  connectionState = "new";
  ontrack: ((event: { streams: unknown[]; track: unknown }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  constructor(_config: unknown) {
    FakePeer.latest = this;
  }
  addTransceiver() {}
  createOffer() {
    return Promise.resolve({ type: "offer", sdp: "offer" });
  }
  setLocalDescription() {
    return Promise.resolve();
  }
  setRemoteDescription() {
    return Promise.resolve();
  }
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

const credentials: MeetCredentials = {
  control_url: "wss://example.test/control",
  control_token: "token",
  session_id: "session",
  ice_servers: [],
};

describe("openJesusStream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeSocket.latest = null;
    FakePeer.latest = null;
  });

  it("queues a spoken line until the socket is open, then sends that turn id", () => {
    vi.stubGlobal("WebSocket", FakeSocket);
    vi.stubGlobal("RTCPeerConnection", FakePeer);
    const video = { srcObject: null as unknown, muted: true, play: vi.fn(async () => undefined) };
    const session = openJesusStream(credentials, video as unknown as HTMLVideoElement, () => undefined, () => undefined, () => undefined);
    const turnId = session.say("I am here");
    expect(FakeSocket.latest?.sent).toEqual([]);
    const socket = FakeSocket.latest;
    if (!socket) throw new Error("missing socket");
    socket.readyState = 1;
    socket.onopen?.();
    const spoken = socket.sent.find((body) => body.includes("turn.submit"));
    expect(spoken).toContain(turnId);
    expect(spoken).toContain("I am here");
    expect(socket.sent[0]).toContain("session.start");
    session.close();
  });

  it("uses the track itself when the remote stream list is empty, and asks for Listen if playback is blocked", async () => {
    vi.stubGlobal("WebSocket", FakeSocket);
    vi.stubGlobal("RTCPeerConnection", FakePeer);
    vi.stubGlobal(
      "MediaStream",
      class {
        constructor(public tracks: unknown[]) {}
      },
    );
    const play = vi.fn(async () => {
      throw new Error("blocked");
    });
    const video = { srcObject: null as unknown, muted: true, play };
    const blocked = vi.fn();
    openJesusStream(
      credentials,
      video as unknown as HTMLVideoElement,
      () => undefined,
      () => undefined,
      () => undefined,
      blocked,
    );
    const track = { id: "remote" };
    FakePeer.latest?.ontrack?.({ streams: [], track });
    expect(video.srcObject).toBeInstanceOf(MediaStream);
    expect((video.srcObject as { tracks: unknown[] }).tracks).toEqual([track]);
    expect(video.muted).toBe(false);
    await vi.waitFor(() => expect(blocked).toHaveBeenCalledOnce());
  });
});

describe("applyTurnText", () => {
  it("keeps each reply on the line that spoke it", () => {
    const lines = [
      { turnId: "a", user: "first", jesus: "" },
      { turnId: "b", user: "second", jesus: "" },
    ];
    const next = applyTurnText(applyTurnText(lines, "b", "second reply"), "a", "first reply");
    expect(next[0]).toMatchObject({ user: "first", jesus: "first reply" });
    expect(next[1]).toMatchObject({ user: "second", jesus: "second reply" });
  });
});
