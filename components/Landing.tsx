"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { inviteLine } from "@/lib/copy";
import { readMemory, writeMemory } from "@/lib/memory";
import { STILL_LINE } from "@/lib/videos";
import { Still } from "./Still";

export function Landing() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const nameRef = useRef<HTMLTextAreaElement>(null);
  const hopeRef = useRef<HTMLTextAreaElement>(null);
  const [phase, setPhase] = useState<"name" | "hope" | "invite">("name");
  const [name, setName] = useState("");
  const [hope, setHope] = useState("");
  const [soundOn, setSoundOn] = useState(false);
  const [missing, setMissing] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const field = phase === "name" ? nameRef.current : hopeRef.current;
    if (field) fitField(field);
  }, [phase, name, hope]);

  function begin() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setSoundOn(true);
    void video.play();
  }

  function replay() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.muted = false;
    setEnded(false);
    void video.play();
  }

  function save(nextName: string, nextHope: string) {
    const memory = readMemory(window.localStorage);
    writeMemory(window.localStorage, {
      ...memory,
      landingComplete: true,
      name: nextName.trim(),
      hope: nextHope.trim(),
    });
    setName(nextName.trim());
    setHope(nextHope.trim());
    setPhase("invite");
  }

  return (
    <main className="column landing">
      <div className="frame">
        {missing ? (
          <Still line={STILL_LINE} />
        ) : (
          <video
            ref={videoRef}
            src="/videos/welcome.mp4"
            playsInline
            muted
            preload="auto"
            onError={() => setMissing(true)}
            onEnded={() => setEnded(true)}
          />
        )}
        {!missing && !soundOn ? (
          <button className="sound-gate" type="button" onClick={begin}>
            <span className="sound-title">Better with sound</span>
            <span className="sound-hint">Tap to turn on the sound</span>
          </button>
        ) : null}
        {soundOn && ended ? (
          <button className="landing-replay" type="button" aria-label="Play again" onClick={replay}>
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 5V2L7 7l5 5V8c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5H5c0 3.87 3.13 7 7 7s7-3.13 7-7-3.13-7-7-7z"
              />
            </svg>
          </button>
        ) : null}
        <div className="landing-veil" aria-hidden="true" hidden={!soundOn && !missing} />
        <div className="landing-sheet" hidden={!soundOn && !missing}>
          {phase === "name" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setPhase("hope");
              }}
            >
              <p>What should I call you?</p>
              <textarea
                ref={nameRef}
                className="field"
                aria-label="What should I call you?"
                rows={1}
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => submitOnEnter(event, () => setPhase("hope"))}
              />
              <div className="landing-actions">
                <button
                  className="text-btn skip"
                  type="button"
                  onClick={() => {
                    setName("");
                    setPhase("hope");
                  }}
                >
                  Skip
                </button>
                <button className="text-btn" type="submit">
                  Continue
                </button>
              </div>
            </form>
          ) : null}
          {phase === "hope" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                save(name, hope);
              }}
            >
              <p>What are you hoping to find here?</p>
              <textarea
                ref={hopeRef}
                className="field"
                aria-label="What are you hoping to find here?"
                rows={1}
                value={hope}
                onChange={(event) => setHope(event.target.value)}
                onKeyDown={(event) => submitOnEnter(event, () => save(name, hope))}
              />
              <div className="landing-actions">
                <button className="text-btn" type="submit">
                  Continue
                </button>
              </div>
            </form>
          ) : null}
          {phase === "invite" ? (
            <>
              <p>{inviteLine(name)}</p>
              <div className="landing-actions">
                <button className="text-btn" type="button" onClick={() => window.location.assign("/")}>
                  Come in
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>, submit: () => void) {
  if (event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  submit();
}

function fitField(node: HTMLTextAreaElement) {
  if (!node.value) {
    node.style.height = "";
    return;
  }
  node.style.height = "auto";
  node.style.height = `${node.scrollHeight}px`;
}
