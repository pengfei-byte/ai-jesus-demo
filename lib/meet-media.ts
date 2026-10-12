export function attachLocalPreview(
  video: { srcObject: unknown },
  stream: unknown,
  pc: { addTrack: (...args: unknown[]) => unknown },
): void {
  video.srcObject = stream;
  void pc;
}

export function waitForIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(finish, 3000);
    function finish() {
      clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", done);
      resolve();
    }
    function done() {
      if (pc.iceGatheringState === "complete") finish();
    }
    pc.addEventListener("icegatheringstatechange", done);
  });
}

export type MeetCredentials = {
  control_url: string;
  control_token: string;
  session_id: string;
  ice_servers: RTCIceServer[];
};

export function openJesusStream(
  credentials: MeetCredentials,
  video: HTMLVideoElement,
  onText: (turnId: string, text: string) => void,
  onRemainingMs: (ms: number) => void,
  onEnd: () => void,
): { say: (text: string) => void; close: () => void } {
  const pc = new RTCPeerConnection({ iceServers: credentials.ice_servers });
  const ws = new WebSocket(`${credentials.control_url}?session_id=${credentials.session_id}`, [
    "r2.v1",
    `r2.token.${credentials.control_token}`,
  ]);

  function send(type: string, data: Record<string, unknown>) {
    ws.send(JSON.stringify({ type, id: `c-${Date.now()}`, data }));
  }

  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });
  pc.ontrack = (event) => {
    video.srcObject = event.streams[0] ?? null;
    void video.play();
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") send("media.connected", {});
    if (pc.connectionState === "failed") onEnd();
  };

  ws.onopen = () => send("session.start", {});
  ws.onmessage = (raw) => {
    void handle(JSON.parse(String(raw.data)) as { type: string; data?: Record<string, unknown> });
  };
  ws.onerror = () => onEnd();

  async function handle(message: { type: string; data?: Record<string, unknown> }) {
    if (message.type === "session.ready") {
      await pc.setLocalDescription(await pc.createOffer());
      await waitForIce(pc);
      send("media.offer", { sdp: pc.localDescription?.sdp ?? "" });
    }
    if (message.type === "media.answer") {
      await pc.setRemoteDescription({ type: "answer", sdp: String(message.data?.sdp ?? "") });
    }
    if (message.type === "turn.text") onText(String(message.data?.turn_id ?? ""), String(message.data?.text ?? ""));
    if (message.type === "usage.tick" || message.type === "session.renewed") {
      onRemainingMs(Number(message.data?.budget_remaining_ms ?? 0));
    }
    if (message.type === "session.ended" || message.type === "error") onEnd();
  }

  return {
    say(text: string) {
      send("turn.submit", { turn_id: `turn_${crypto.randomUUID()}`, text });
    },
    close() {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      pc.onconnectionstatechange = null;
      pc.ontrack = null;
      ws.close();
      pc.close();
    },
  };
}
