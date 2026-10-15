"use client";

import { useEffect, useRef, useState } from "react";
import { CRISIS_PORTRAIT, CRISIS_REPLY, isCrisis } from "@/lib/crisis";
import { appendExchange, canEnterRoom, readMemory, withPortrait, writeMemory } from "@/lib/memory";
import { applyTurnText, attachLocalPreview, openJesusStream, type MeetCredentials, type TranscriptLine } from "@/lib/meet-media";
import { greetingRequest, OPENING_COUNT, openingFor } from "@/lib/openings";
import { speechHoldMs, watchRemoteSpeech } from "@/lib/remote-speech";
import { playAloud } from "@/lib/stage-nav";
import { RoomChat } from "./RoomChat";
import { StageLink } from "./StageLink";

type Phase = "intro" | "call";
type Line = TranscriptLine & { key: number; opening?: boolean };
type Waiting = { key: number; message: string };

export function Meet() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraNote, setCameraNote] = useState("");
  const [live, setLive] = useState(false);
  const [link, setLink] = useState<"connecting" | "live" | "failed">("connecting");
  const [credentials, setCredentials] = useState<MeetCredentials | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [needsListen, setNeedsListen] = useState(false);
  const [text, setText] = useState("");
  const [remaining, setRemaining] = useState("3:00");
  const [held, setHeld] = useState(false);
  const [heard, setHeard] = useState(false);
  const introRef = useRef<HTMLVideoElement>(null);
  const localRef = useRef<HTMLVideoElement>(null);
  const jesusRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<ReturnType<typeof openJesusStream> | null>(null);
  const seenRef = useRef(false);
  const lineKey = useRef(0);
  const waitingRef = useRef<Waiting[]>([]);
  const linkRef = useRef<"opening" | "yes" | "no">("opening");
  const triesRef = useRef(0);
  const linesRef = useRef<Line[]>([]);
  const greetedRef = useRef(false);
  const holdTimer = useRef(0);
  const holdForRef = useRef<(ms: number) => void>(() => undefined);
  linesRef.current = lines;
  holdForRef.current = (ms: number) => {
    window.clearTimeout(holdTimer.current);
    setHeld(true);
    holdTimer.current = window.setTimeout(() => setHeld(false), ms);
  };

  useEffect(() => {
    const memory = readMemory(window.localStorage);
    if (!canEnterRoom(memory)) window.location.assign("/");
  }, []);

  useEffect(() => {
    if (phase !== "intro") return;
    playAloud(introRef.current);
  }, [phase]);

  useEffect(() => {
    return () => {
      window.clearTimeout(holdTimer.current);
      sessionRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!cameraOn || !localRef.current || !streamRef.current) return;
    attachLocalPreview(localRef.current, streamRef.current, { addTrack: () => undefined });
    void localRef.current.play();
  }, [cameraOn]);

  useEffect(() => {
    if (!credentials || !jesusRef.current || sessionRef.current) return;
    const video = jesusRef.current;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const left = Math.max(0, 180000 - (Date.now() - started));
      setRemaining(formatMs(left));
      if (left <= 0) leave();
    }, 500);
    const session = openJesusStream(
      credentials,
      video,
      (turnId, jesus) => {
        setLines((current) => {
          const existing = current.find((line) => line.turnId === turnId);
          if (existing?.opening) return current;
          const before = existing?.jesus ?? "";
          const next = applyTurnText(current, turnId, jesus).map((item, index) => ({ ...current[index], ...item }));
          const line = next.find((item) => item.turnId === turnId);
          if (!before && line?.jesus) {
            remember(line.user, line.jesus);
            holdForRef.current(speechHoldMs(line.jesus));
          }
          return next;
        });
      },
      (ms) => setRemaining(formatMs(ms)),
      () => {
        window.clearInterval(timer);
        const dead = sessionRef.current;
        sessionRef.current = null;
        dead?.close();
        if (seenRef.current) {
          leave();
          return;
        }
        if (triesRef.current < 1) {
          triesRef.current += 1;
          waitingRef.current = linesRef.current
            .filter((line) => !line.jesus && line.user)
            .map((line) => ({ key: line.key, message: line.user }));
          void beginSession();
          return;
        }
        linkRef.current = "no";
        setLink("failed");
      },
      () => setNeedsListen(true),
    );
    sessionRef.current = session;
    linkRef.current = "yes";
    greet(session);
    const waiting = waitingRef.current;
    waitingRef.current = [];
    for (const item of waiting) {
      const turnId = session.say(item.message);
      setLines((current) => current.map((line) => (line.key === item.key ? { ...line, turnId } : line)));
    }
    return () => {
      window.clearInterval(timer);
      greetedRef.current = false;
      session.close();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [credentials]);

  useEffect(() => {
    const video = jesusRef.current;
    if (phase !== "call" || !live || !video) return;
    return watchRemoteSpeech(video, (speaking) => {
      setHeard(speaking);
      if (!speaking) {
        window.clearTimeout(holdTimer.current);
        setHeld(false);
      }
    });
  }, [phase, live]);

  async function openCall() {
    setPhase("call");
    setLink("connecting");
    linkRef.current = "opening";
    await startCamera();
    await beginSession();
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setCameraNote("");
      setCameraOn(true);
    } catch {
      setCameraNote("You can still sit with me.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function toggleCamera() {
    if (streamRef.current) {
      stopCamera();
      return;
    }
    void startCamera();
  }

  function retry() {
    triesRef.current = 0;
    seenRef.current = false;
    setLive(false);
    void beginSession();
  }

  async function beginSession() {
    linkRef.current = "opening";
    setLink("connecting");
    const memory = readMemory(window.localStorage);
    try {
      const response = await fetch("/api/meet/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: memory.name, hope: memory.hope, portrait: memory.portrait }),
      });
      const body = (await response.json()) as { live: boolean; credentials?: MeetCredentials };
      if (body.live && body.credentials) {
        setCredentials(body.credentials);
        return;
      }
    } catch {
      /* The portrait stays on the reference image. */
    }
    linkRef.current = "no";
    setLink("failed");
  }

  function leave() {
    sessionRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    window.location.assign("/");
  }

  function greet(session: { say: (text: string) => string }) {
    if (greetedRef.current) return;
    greetedRef.current = true;
    const line = openingFor(readMemory(window.localStorage).name, Math.floor(Math.random() * OPENING_COUNT));
    const key = lineKey.current++;
    const turnId = session.say(greetingRequest(line));
    setLines((current) => [{ key, turnId, user: "", jesus: line, opening: true }, ...current.filter((item) => !item.opening)]);
    holdForRef.current(speechHoldMs(line));
  }

  async function speak(incoming?: string) {
    const message = (incoming ?? text).trim();
    if (!message) return;
    const key = lineKey.current++;
    setText("");
    if (isCrisis(message)) {
      setLines((current) => [...current, { key, turnId: "", user: message, jesus: CRISIS_REPLY }]);
      remember(message, CRISIS_REPLY, CRISIS_PORTRAIT);
      return;
    }
    holdForRef.current(12000);
    if (sessionRef.current) {
      const turnId = sessionRef.current.say(message);
      setLines((current) => [...current, { key, turnId, user: message, jesus: "" }]);
      return;
    }
    waitingRef.current.push({ key, message });
    setLines((current) => [...current, { key, turnId: "", user: message, jesus: "" }]);
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
    <main className="column landing">
      {phase === "intro" ? (
        <div className="frame stage stage-enter">
          <video
            ref={introRef}
            src="/videos/meet-intro.mp4"
            playsInline
            autoPlay
            onLoadedData={() => playAloud(introRef.current)}
          />
          <StageLink className="stage-return" href="/">
            Return
          </StageLink>
          <div className="landing-veil" aria-hidden="true" />
          <div className="landing-sheet">
            <p className="meet-note">
              This will open your camera, so you can talk with Jesus face to face. When you are ready, press Continue.
            </p>
            <div className="landing-actions">
              <button className="text-btn" type="button" onClick={() => void openCall()}>
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="frame stage call">
          <img className="call-face" src="/jesus-reference.jpg" alt="" />
          <video
            ref={jesusRef}
            className={live ? "call-face" : "parked"}
            playsInline
            onPlaying={() => {
              seenRef.current = true;
              setLive(true);
              setLink("live");
            }}
          />
          <button
            className="call-self"
            type="button"
            aria-pressed={cameraOn}
            aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
            onClick={toggleCamera}
          >
            {cameraOn ? <video ref={localRef} playsInline muted /> : (
              <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
                <path d="M15 10.2V8.2A1.7 1.7 0 0 0 13.3 6.5H8" />
                <path d="M4.7 8.4A1.7 1.7 0 0 0 3.2 10v5.5A1.7 1.7 0 0 0 4.9 17.2H13" />
                <path d="M15 13.1 20.2 16V8.4L15 11.2" />
                <path d="M4 20 20 4" />
              </svg>
            )}
          </button>
          {credentials ? <p className="meet-time">{remaining}</p> : null}
          {link === "connecting" && !live ? (
            <p className="call-status">
              Connecting
              <span className="reply-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </p>
          ) : null}
          {link === "failed" ? (
            <div className="call-status">
              <p>Couldn&apos;t connect.</p>
              <button type="button" onClick={retry}>
                Retry
              </button>
            </div>
          ) : null}
          <StageLink className="stage-return" href="/">
            Return
          </StageLink>
          <RoomChat
            lines={lines.slice(-1)}
            text={text}
            placeholder="What would you like to say?"
            voice
            veil="meet-veil"
            ear={!held && !heard}
            onText={setText}
            onSpeak={() => void speak()}
            onUtterance={(said) => void speak(said)}
          />
          {needsListen ? (
            <button className="listen" type="button" onClick={listen}>
              Listen
              <span aria-hidden="true">▶</span>
            </button>
          ) : null}
        </div>
      )}
      {cameraNote ? <p className="camera-note">{cameraNote}</p> : null}
    </main>
  );
}

function remember(user: string, jesus: string, portrait?: string) {
  const memory = readMemory(window.localStorage);
  const next = appendExchange(memory, { mode: "meet", at: new Date().toISOString(), user, jesus });
  writeMemory(window.localStorage, portrait === undefined ? next : withPortrait(next, portrait));
}

function formatMs(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
