"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { playAloud } from "@/lib/stage-nav";
import { StageLink } from "./StageLink";
import { selectDaily, STILL_LINE, type VideoChoice } from "@/lib/videos";
import { Still } from "./Still";

const SOUND = "ai-jesus.sound";

function DoorIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      {children}
    </svg>
  );
}

async function probe(name: string): Promise<boolean> {
  const response = await fetch(`/videos/${name}`, { method: "HEAD" });
  return response.ok;
}

export function Sanctuary({ choice }: { choice?: VideoChoice }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resolved, setResolved] = useState<VideoChoice | null>(choice ?? null);
  const [soundOn, setSoundOn] = useState(false);
  const [ended, setEnded] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (choice) return;
    const weekday = new Date().getDay();
    setResolved(selectDaily(weekday, () => false));
    void probe(`daily-${weekday}.mp4`).then(async (hasDay) => {
      if (hasDay) {
        setResolved(selectDaily(weekday, (name) => name === `daily-${weekday}.mp4`));
        return;
      }
      const hasShared = await probe("daily.mp4");
      setResolved(selectDaily(weekday, (name) => (name === `daily-${weekday}.mp4` ? hasDay : hasShared && name === "daily.mp4")));
    });
  }, [choice]);

  const playing = resolved?.kind === "file" && !missing;
  const showSheet = !playing || soundOn;

  function begin() {
    const video = videoRef.current;
    if (!video) return;
    sessionStorage.setItem(SOUND, "1");
    setSoundOn(true);
    playAloud(video);
  }

  function replay() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.muted = false;
    setEnded(false);
    void video.play();
  }

  return (
    <main className="column landing">
      <div className="frame stage">
        {playing ? (
          <video
            ref={videoRef}
            src={resolved.src}
            playsInline
            preload="auto"
            onLoadedData={() => {
              const video = videoRef.current;
              if (!video) return;
              if (sessionStorage.getItem(SOUND) === "1") {
                setSoundOn(true);
                playAloud(video);
                return;
              }
              video.muted = true;
            }}
            onError={() => setMissing(true)}
            onEnded={() => setEnded(true)}
          />
        ) : (
          <Still line={resolved?.kind === "still" ? resolved.line : STILL_LINE} />
        )}
        {playing && !soundOn ? (
          <button className="sound-gate" type="button" onClick={begin}>
            <span className="sound-title">Better with sound</span>
            <span className="sound-hint">Tap to turn on the sound</span>
          </button>
        ) : null}
        {playing && soundOn && ended ? (
          <button className="landing-replay" type="button" aria-label="Play again" onClick={replay}>
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 5V2L7 7l5 5V8c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5H5c0 3.87 3.13 7 7 7s7-3.13 7-7-3.13-7-7-7z"
              />
            </svg>
          </button>
        ) : null}
        <header className="sanctuary-top">
          <p className="today">TODAY</p>
        </header>
        <div className="landing-veil" aria-hidden="true" hidden={!showSheet} />
        <div className="landing-sheet" hidden={!showSheet}>
          <nav className="sanctuary-actions">
            <StageLink href="/confess">
              <DoorIcon>
                <path d="M2 17c2.4 0 3.6-3.2 5-6.2 1.4 3 2.6 6.2 5 6.2" />
                <path d="M22 17c-2.4 0-3.6-3.2-5-6.2-1.4 3-2.6 6.2-5 6.2" />
              </DoorIcon>
              Confess
            </StageLink>
            <StageLink href="/pray">
              <DoorIcon>
                <path d="M12 22V10" />
                <path d="M8 22h8" />
                <path d="M12 8.5c1.1-1.6 2.6-2.6 2.6-4.3C14.6 2.4 13.4 1 12 1S9.4 2.4 9.4 4.2C9.4 5.9 10.9 6.9 12 8.5z" />
              </DoorIcon>
              Pray
            </StageLink>
            <StageLink href="/talk">
              <DoorIcon>
                <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-3.2 3V16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z" />
              </DoorIcon>
              Talk
            </StageLink>
          </nav>
          <StageLink className="sanctuary-meet" href="/meet">
            <span className="meet-label">
              <DoorIcon>
                <path d="M4 21V9" />
                <path d="M20 21V9" />
                <path d="M4 9a8 8 0 0 1 16 0" />
                <path d="M4 21h16" />
                <circle cx="15.5" cy="15" r="0.9" fill="currentColor" stroke="none" />
              </DoorIcon>
              Meet in person
            </span>
            <span className="gold">FREE FOR A LIMITED TIME</span>
          </StageLink>
        </div>
      </div>
    </main>
  );
}
