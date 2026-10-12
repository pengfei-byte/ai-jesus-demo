"use client";

import { useRef, useState } from "react";
import { STILL_LINE } from "@/lib/videos";
import { Still } from "./Still";

export function VideoFrame({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [missing, setMissing] = useState(false);

  if (missing) return <Still line={STILL_LINE} />;

  function listen() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    void video.play();
  }

  return (
    <div className="frame">
      <video
        ref={videoRef}
        src={src}
        playsInline
        autoPlay
        muted
        onError={() => setMissing(true)}
      />
      <button className="listen" type="button" onClick={listen}>
        Listen
        <span aria-hidden="true">▶</span>
      </button>
    </div>
  );
}
