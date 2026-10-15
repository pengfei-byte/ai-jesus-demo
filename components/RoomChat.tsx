"use client";

import { useEffect, useRef, useState } from "react";
import { startVoiceInput, type SpeechLike } from "@/lib/voice-input";

export type RoomLine = { user: string; jesus: string };

export function RoomChat({
  lines,
  text,
  placeholder,
  voice,
  ear = true,
  veil = "room-veil",
  onText,
  onSpeak,
  onUtterance,
}: {
  lines: RoomLine[];
  text: string;
  placeholder?: string;
  voice?: boolean;
  ear?: boolean;
  veil?: string;
  onText: (value: string) => void;
  onSpeak: () => void;
  onUtterance?: (text: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const voiceRef = useRef<{ stop: () => void; hold: () => void; release: () => void; commit: () => void } | null>(null);
  const [hearing, setHearing] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [lines]);

  useEffect(() => {
    const field = fieldRef.current;
    if (field) fitField(field);
  }, [text]);

  useEffect(() => {
    return () => voiceRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!voiceRef.current) return;
    if (ear) voiceRef.current.release();
    else voiceRef.current.hold();
  }, [ear]);

  function toggleVoice() {
    if (voiceRef.current) {
      voiceRef.current.stop();
      voiceRef.current = null;
      setHearing(false);
      return;
    }
    const speech = window as Window & {
      SpeechRecognition?: new () => SpeechLike;
      webkitSpeechRecognition?: new () => SpeechLike;
    };
    const session = startVoiceInput(
      speech.SpeechRecognition ?? speech.webkitSpeechRecognition,
      onText,
      () => {
        voiceRef.current = null;
        setHearing(false);
      },
      {
        onPause(said) {
          onText("");
          onUtterance?.(said);
        },
      },
    );
    if (!session) return;
    voiceRef.current = session;
    if (!ear) session.hold();
    setHearing(true);
  }

  return (
    <>
      <div className={lines.length ? `landing-veil ${veil}` : "landing-veil"} aria-hidden="true" />
      <div className="landing-sheet room-sheet">
        {lines.length ? (
          <div className="room-lines" ref={listRef}>
            {lines.map((line, index) => (
              <div className="room-turn" key={`${index}-${line.user}`}>
                {line.user ? <p className="you">{line.user}</p> : null}
                {line.jesus ? (
                  <p className="reply">{line.jesus}</p>
                ) : (
                  <p className="reply pending">
                    Jesus is replying
                    <span className="reply-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : null}
        <div className="room-compose">
          <textarea
            ref={fieldRef}
            aria-label="Your words"
            className="field"
            placeholder={hearing ? (ear ? "Listening… pause to send" : "Jesus is speaking") : placeholder}
            rows={1}
            value={text}
            onChange={(event) => onText(event.target.value)}
          />
          {voice ? (
            <button
              className={hearing ? "mic on" : "mic"}
              type="button"
              aria-pressed={hearing}
              aria-label={hearing ? "Stop voice" : "Voice"}
              onClick={toggleVoice}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <path d="M12 18v3" />
              </svg>
            </button>
          ) : null}
          <button
            className="speak"
            type="button"
            onClick={() => {
              voiceRef.current?.commit();
              onSpeak();
            }}
          >
            Speak
          </button>
        </div>
      </div>
    </>
  );
}

function fitField(node: HTMLTextAreaElement) {
  if (!node.value) {
    node.style.height = "";
    return;
  }
  node.style.height = "auto";
  node.style.height = `${node.scrollHeight}px`;
}
