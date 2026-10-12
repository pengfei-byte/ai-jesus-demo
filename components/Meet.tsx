"use client";

import { useEffect, useRef, useState } from "react";
import { appendExchange, canEnterRoom, readMemory, writeMemory } from "@/lib/memory";
import { attachLocalPreview, openJesusStream, type MeetCredentials } from "@/lib/meet-media";
import { Still } from "./Still";
import { VideoFrame } from "./VideoFrame";

type Phase = "intro" | "mirror" | "live";

export function Meet() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [cameraNote, setCameraNote] = useState("");
  const [liveState, setLiveState] = useState<"idle" | "yes" | "no">("idle");
  const [credentials, setCredentials] = useState<MeetCredentials | null>(null);
  const [lines, setLines] = useState<Array<{ user: string; jesus: string }>>([]);
  const [text, setText] = useState("");
  const [remaining, setRemaining] = useState("3:00");
  const localRef = useRef<HTMLVideoElement>(null);
  const jesusRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<ReturnType<typeof openJesusStream> | null>(null);
  const pendingUser = useRef("");

  useEffect(() => {
    const memory = readMemory(window.localStorage);
    if (!canEnterRoom(memory)) window.location.assign("/");
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!credentials || !jesusRef.current || sessionRef.current) return;
    const video = jesusRef.current;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const left = Math.max(0, 180000 - (Date.now() - started));
      setRemaining(formatMs(left));
      if (left <= 0) leave();
    }, 500);
    sessionRef.current = openJesusStream(
      credentials,
      video,
      (_turnId, jesus) => {
        const user = pendingUser.current;
        setLines((current) => {
          const next = [...current];
          const last = next[next.length - 1];
          if (last && !last.jesus) next[next.length - 1] = { ...last, jesus };
          return next;
        });
        const latest = readMemory(window.localStorage);
        writeMemory(
          window.localStorage,
          appendExchange(latest, { mode: "meet", at: new Date().toISOString(), user, jesus }),
        );
      },
      (ms) => setRemaining(formatMs(ms)),
      () => {
        window.clearInterval(timer);
        leave();
      },
    );
    return () => window.clearInterval(timer);
  }, [credentials]);

  async function openMirror() {
    setPhase("mirror");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (localRef.current) {
        attachLocalPreview(localRef.current, stream, { addTrack: () => undefined });
        await localRef.current.play();
      }
    } catch {
      setCameraNote("You can still sit with me.");
    }
  }

  function leave() {
    sessionRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    window.location.assign("/");
  }

  async function ready() {
    setPhase("live");
    const memory = readMemory(window.localStorage);
    try {
      const response = await fetch("/api/meet/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: memory.name, hope: memory.hope, portrait: memory.portrait }),
      });
      const body = (await response.json()) as { live: boolean; credentials?: MeetCredentials };
      if (!body.live || !body.credentials) {
        setLiveState("no");
        return;
      }
      setLiveState("yes");
      setCredentials(body.credentials);
    } catch {
      setLiveState("no");
    }
  }

  function say() {
    const message = text.trim();
    if (!message || !sessionRef.current) return;
    pendingUser.current = message;
    setText("");
    setLines((current) => [...current, { user: message, jesus: "" }]);
    sessionRef.current.say(message);
  }

  return (
    <main className="column meet-page">
      {phase === "intro" ? (
        <>
          <VideoFrame src="/videos/meet-intro.mp4" />
          <button className="send" type="button" onClick={() => void openMirror()}>
            Continue
          </button>
        </>
      ) : null}
      {phase !== "intro" ? (
        <div className="wide-meet">
          <div className="frame">
            <video ref={localRef} playsInline muted />
            {cameraNote ? <p>{cameraNote}</p> : null}
          </div>
          <div className="frame">
            {phase === "mirror" ? <Still line="When you are ready, sit as you would if I were across from you." /> : null}
            {phase === "live" && liveState === "yes" ? <video ref={jesusRef} playsInline autoPlay /> : null}
            {phase === "live" && liveState === "no" ? <Still line="The live meeting opens when the portrait is connected." /> : null}
          </div>
        </div>
      ) : null}
      {phase === "mirror" ? (
        <button className="send" type="button" onClick={() => void ready()}>
          I am ready
        </button>
      ) : null}
      {phase === "live" && liveState === "yes" ? (
        <>
          <p className="today">{remaining}</p>
          {lines.map((line, index) => (
            <article key={index}>
              <p>{line.user}</p>
              <p className="reply">{line.jesus}</p>
            </article>
          ))}
          <textarea aria-label="Your words" className="field" value={text} onChange={(event) => setText(event.target.value)} />
          <button className="send" type="button" onClick={say}>
            Speak
          </button>
        </>
      ) : null}
    </main>
  );
}

function formatMs(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
