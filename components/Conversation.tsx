"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FALLBACK, type RoomMode } from "@/lib/persona";
import {
  appendExchange,
  canEnterRoom,
  foldPortrait,
  readMemory,
  withPortrait,
  writeMemory,
} from "@/lib/memory";
import { VideoFrame } from "./VideoFrame";

type ReplyPayload = { reply: string; portrait: string; source: "model" | "fallback" | "crisis" | "limited" };

export function Conversation({ mode, src }: { mode: RoomMode; src: string }) {
  const [allowed, setAllowed] = useState(false);
  const [text, setText] = useState("");
  const [lines, setLines] = useState<Array<{ user: string; jesus: string }>>([]);

  useEffect(() => {
    const memory = readMemory(window.localStorage);
    if (!canEnterRoom(memory)) {
      window.location.assign("/");
      return;
    }
    setAllowed(true);
  }, []);

  async function speak() {
    const message = text.trim();
    if (!message) return;
    setText("");
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
      payload = { reply: FALLBACK[mode], portrait: memory.portrait, source: "fallback" };
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
    setLines((current) => [...current, { user: message, jesus: payload.reply }]);
  }

  if (!allowed) return <main className="column" />;

  return (
    <main className="column">
      <VideoFrame src={src} />
      <Link href="/">Return</Link>
      {lines.map((line, index) => (
        <article key={index}>
          <p>{line.user}</p>
          <p className="reply">{line.jesus}</p>
        </article>
      ))}
      <textarea aria-label="Your words" className="field" value={text} onChange={(event) => setText(event.target.value)} />
      <button className="send" type="button" onClick={() => void speak()}>
        Speak
      </button>
    </main>
  );
}
