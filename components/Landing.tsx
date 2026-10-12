"use client";

import { useState } from "react";
import { inviteLine } from "@/lib/copy";
import { readMemory, writeMemory } from "@/lib/memory";
import { VideoFrame } from "./VideoFrame";

export function Landing() {
  const [phase, setPhase] = useState<"name" | "hope" | "invite">("name");
  const [name, setName] = useState("");
  const [hope, setHope] = useState("");

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
    <main className="column">
      <VideoFrame src="/videos/welcome.mp4" />
      {phase === "name" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPhase("hope");
          }}
        >
          <p>What should I call you?</p>
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} />
          <button className="send" type="submit">
            Continue
          </button>
          <button
            className="send"
            type="button"
            onClick={() => {
              setName("");
              setPhase("hope");
            }}
          >
            Skip
          </button>
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
          <input className="field" value={hope} onChange={(event) => setHope(event.target.value)} />
          <button className="send" type="submit">
            Continue
          </button>
        </form>
      ) : null}
      {phase === "invite" ? (
        <>
          <p>{inviteLine(name)}</p>
          <button className="send" type="button" onClick={() => window.location.assign("/")}>
            Come in
          </button>
        </>
      ) : null}
    </main>
  );
}
