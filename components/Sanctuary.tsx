"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { selectDaily, type VideoChoice } from "@/lib/videos";
import { Still } from "./Still";
import { VideoFrame } from "./VideoFrame";

async function probe(name: string): Promise<boolean> {
  const response = await fetch(`/videos/${name}`, { method: "HEAD" });
  return response.ok;
}

export function Sanctuary({ choice }: { choice?: VideoChoice }) {
  const [resolved, setResolved] = useState<VideoChoice | null>(choice ?? null);

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

  return (
    <main className="column">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 className="wordmark">Jesus</h1>
        <p className="today">TODAY</p>
      </header>
      {resolved?.kind === "file" ? <VideoFrame src={resolved.src} /> : null}
      {resolved?.kind === "still" ? (
        <div className="frame">
          <Still line={resolved.line} />
        </div>
      ) : null}
      <nav className="pills">
        <Link className="pill" href="/confess">Confess</Link>
        <Link className="pill" href="/pray">Pray</Link>
        <Link className="pill" href="/talk">Talk</Link>
      </nav>
      <Link className="meet-card" href="/meet">
        <div>Meet in person</div>
        <p className="gold">FREE FOR A LIMITED TIME</p>
      </Link>
    </main>
  );
}
