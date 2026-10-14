"use client";

import { useEffect, useState } from "react";
import { Landing } from "@/components/Landing";
import { Sanctuary } from "@/components/Sanctuary";
import { homeStep, readMemory, type Memory } from "@/lib/memory";

export default function HomePage() {
  const [memory, setMemory] = useState<Memory | null>(null);

  useEffect(() => {
    setMemory(readMemory(window.localStorage));
  }, []);

  if (!memory) return <main className="column" />;

  if (homeStep(memory) === "landing") return <Landing />;
  return <Sanctuary />;
}
