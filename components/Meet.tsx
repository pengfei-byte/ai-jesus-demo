"use client";

import { useEffect, useRef, useState } from "react";
import { appendExchange, canEnterRoom, readMemory, writeMemory } from "@/lib/memory";
import { applyTurnText, attachLocalPreview, openJesusStream, type MeetCredentials, type TranscriptLine } from "@/lib/meet-media";
import { Still } from "./Still";
import { VideoFrame } from "./VideoFrame";

type Phase = "intro" | "mirror" | "live";

export function Meet() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [cameraNote, setCameraNote] = useState("");
  const [liveState, setLiveState] = useState<"idle" | "yes" | "no">("idle");
  const [credentials, setCredentials] = useState<MeetCredentials | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [needsListen, setNeedsListen] = useState(false);
  const [text, setText] = useState("");
  const [remaining, setRemaining] = useState("3:00");
  const localRef = useRef<HTMLVideoElement>(null);
  const jesusRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<ReturnType<typeof openJesusStream> | null>(null);

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
      (turnId, jesus) => {
        setLines((current) => {
          const next = applyTurnText(current, turnId, jesus);
          const line = next.find((item) => item.turnId === turnId) ?? next.find((item) => item.jesus === jesus);
          if (line) {
            const latest = readMemory(window.localStorage);
            writeMemory(
              window.localStorage,
              appendExchange(latest, { mode: "meet", at: new Date().toISOString(), user: line.user, jesus: line.jesus }),
            );
          }
          return next;
        });
      },
      (ms) => setRemaining(formatMs(ms)),
      () => {
        window.clearInterval(timer);
        leave();
      },
      () => setNeedsListen(true),
    );
    return () => {
      window.clearInterval(timer);
      sessionRef.current?.close();
      sessionRef.current = null;
    };
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
    const video = jesusRef.current;
    if (video) {
      video.muted = true;
      void Promise.resolve(video.play()).catch(() => setNeedsListen(true));
    }
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
    const turnId = sessionRef.current.say(message);
    setText("");
    setLines((current) => [...current, { turnId, user: message, jesus: "" }]);
  }

  function listen() {
    const video = jesusRef.current;
    if (!video) return;
    video.muted = false;
    void Promise.resolve(video.play())
      .then(() => setNeedsListen(false))
      .catch(() => setNeedsListen(true));
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
        <div className={phase === "live" ? "wide-meet live" : "wide-meet"}>
          <div className="frame">
            <video ref={localRef} playsInline muted />
          </div>
          <div className="frame">
            <video
              ref={jesusRef}
              className={phase === "live" && liveState === "yes" ? undefined : "parked"}
              playsInline
              muted
            />
            {phase === "live" && liveState === "yes" ? null : (
              <Still
                line={
                  phase === "live" && liveState === "no"
                    ? "The live meeting opens when the portrait is connected."
                    : "When you are ready, sit as you would if I were across from you."
                }
              />
            )}
            {needsListen && phase === "live" && liveState === "yes" ? (
              <button className="listen" type="button" onClick={listen}>
                Listen
                <span aria-hidden="true">▶</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {cameraNote ? <p>{cameraNote}</p> : null}
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
