"use client";

import { useEffect, useRef, useState } from "react";
import { CRISIS_PORTRAIT, CRISIS_REPLY, isCrisis } from "@/lib/crisis";
import { playAloud } from "@/lib/stage-nav";
import { FALLBACK, type RoomMode } from "@/lib/persona";
import {
  appendExchange,
  canEnterRoom,
  foldPortrait,
  readMemory,
  withPortrait,
  writeMemory,
} from "@/lib/memory";
import { STILL_LINE } from "@/lib/videos";
import { RoomChat } from "./RoomChat";
import { StageLink } from "./StageLink";
import { Still } from "./Still";

type ReplyPayload = { reply: string; portrait: string; source: "model" | "fallback" | "crisis" | "limited" };

const PLACEHOLDER: Record<RoomMode, string> = {
  confess: "What do you need to lay down?",
  pray: "Who or what shall we pray for?",
  talk: "What is on your heart?",
};

export function Conversation({ mode, src }: { mode: RoomMode; src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [allowed, setAllowed] = useState(false);
  const [missing, setMissing] = useState(false);
  const [text, setText] = useState("");
  const [lines, setLines] = useState<Array<{ key: number; user: string; jesus: string }>>([]);
  const lineKey = useRef(0);

  useEffect(() => {
    const memory = readMemory(window.localStorage);
    if (!canEnterRoom(memory)) {
      window.location.assign("/");
      return;
    }
    setAllowed(true);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    playAloud(videoRef.current);
  }, [allowed]);

  async function speak() {
    const message = text.trim();
    if (!message) return;
    const key = lineKey.current++;
    setText("");
    setLines((current) => [...current, { key, user: message, jesus: "" }]);
    const memory = readMemory(window.localStorage);
    let payload: ReplyPayload = { reply: FALLBACK[mode], portrait: memory.portrait, source: "fallback" };
    try {
      const response = await fetch("/api/reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          message,
          name: memory.name,
          hope: memory.hope,
          portrait: memory.portrait,
          recent: memory.recent,
        }),
      });
      payload = (await response.json()) as ReplyPayload;
    } catch {
      payload = isCrisis(message)
        ? { reply: CRISIS_REPLY, portrait: CRISIS_PORTRAIT, source: "crisis" }
        : { reply: FALLBACK[mode], portrait: memory.portrait, source: "fallback" };
    }
    const portrait =
      payload.source === "model" || payload.source === "crisis"
        ? payload.portrait
        : foldPortrait(memory.portrait, message);
    const next = withPortrait(
      appendExchange(memory, {
        mode,
        at: new Date().toISOString(),
        user: message,
        jesus: payload.reply,
      }),
      portrait,
    );
    writeMemory(window.localStorage, next);
    setLines((current) => current.map((line) => (line.key === key ? { ...line, jesus: payload.reply } : line)));
  }

  if (!allowed) return <main className="column" />;

  return (
    <main className="column landing">
      <div className="frame stage stage-enter">
        {missing ? (
          <Still line={STILL_LINE} />
        ) : (
          <video
            ref={videoRef}
            src={src}
            playsInline
            autoPlay
            onLoadedData={() => playAloud(videoRef.current)}
            onError={() => setMissing(true)}
          />
        )}
        <StageLink className="stage-return" href="/">
          Return
        </StageLink>
        <RoomChat lines={lines} text={text} placeholder={PLACEHOLDER[mode]} onText={setText} onSpeak={() => void speak()} />
      </div>
    </main>
  );
}
