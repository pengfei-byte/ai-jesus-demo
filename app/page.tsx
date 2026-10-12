"use client";

import { useEffect, useState } from "react";
import { Gate } from "@/components/Gate";
import { Landing } from "@/components/Landing";
import { Sanctuary } from "@/components/Sanctuary";
import { homeStep, readMemory, writeMemory, type Memory } from "@/lib/memory";

export default function HomePage() {
  const [memory, setMemory] = useState<Memory | null>(null);

  useEffect(() => {
    setMemory(readMemory(window.localStorage));
  }, []);

  if (!memory) return <main className="column" />;

  const step = homeStep(memory);
  if (step === "gate") {
    return (
      <Gate
        onConfirm={() => {
          const next = { ...memory, adultConfirmed: true };
          writeMemory(window.localStorage, next);
          setMemory(next);
        }}
      />
    );
  }
  if (step === "landing") return <Landing />;
  return <Sanctuary />;
}
