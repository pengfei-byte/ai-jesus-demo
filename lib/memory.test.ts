import { describe, expect, it } from "vitest";
import {
  EMPTY_MEMORY,
  MEMORY_KEY,
  appendExchange,
  canEnterRoom,
  foldPortrait,
  forgetMemory,
  homeStep,
  readMemory,
  withPortrait,
  writeMemory,
  type KeyValueStore,
  type Memory,
} from "./memory";

function store(): KeyValueStore & { dump: Record<string, string> } {
  const dump: Record<string, string> = {};
  return {
    dump,
    getItem: (key) => dump[key] ?? null,
    setItem: (key, value) => {
      dump[key] = value;
    },
    removeItem: (key) => {
      delete dump[key];
    },
  };
}

const base: Memory = { ...EMPTY_MEMORY, recent: [] };

describe("memory", () => {
  it("appends one exchange", () => {
    const next = appendExchange(base, {
      mode: "confess",
      at: "2026-10-12T12:00:00.000Z",
      user: "I lied",
      jesus: "I hear you",
    });
    expect(next.recent).toHaveLength(1);
    expect(next.recent[0]?.user).toBe("I lied");
  });

  it("drops the oldest exchange past 8", () => {
    let memory = base;
    for (let i = 0; i < 9; i += 1) {
      memory = appendExchange(memory, {
        mode: "talk",
        at: "2026-10-12T12:00:00.000Z",
        user: `u${i}`,
        jesus: `j${i}`,
      });
    }
    expect(memory.recent).toHaveLength(8);
    expect(memory.recent[0]?.user).toBe("u1");
    expect(memory.recent[7]?.user).toBe("u8");
  });

  it("clips each side to 280 characters", () => {
    const next = appendExchange(base, {
      mode: "pray",
      at: "2026-10-12T12:00:00.000Z",
      user: "a".repeat(300),
      jesus: "b".repeat(300),
    });
    expect(next.recent[0]?.user).toHaveLength(280);
    expect(next.recent[0]?.jesus).toHaveLength(280);
  });

  it("replaces the portrait and trims to 80 words", () => {
    const words = Array.from({ length: 90 }, (_, i) => `w${i}`).join(" ");
    const next = withPortrait(base, words);
    expect(next.portrait.split(" ")).toHaveLength(80);
    expect(next.portrait.startsWith("w0")).toBe(true);
  });

  it("folds the user's words into the portrait when there is no model", () => {
    const portrait = foldPortrait("Anna came for peace.", "she misses her mother");
    expect(portrait).toBe("Anna came for peace. she misses her mother");
  });

  it("forgets the key", () => {
    const saved = store();
    writeMemory(saved, { ...base, adultConfirmed: true, name: "Anna" });
    expect(saved.dump[MEMORY_KEY]).toContain("Anna");
    forgetMemory(saved);
    expect(saved.dump[MEMORY_KEY]).toBeUndefined();
    expect(readMemory(saved)).toEqual(EMPTY_MEMORY);
  });

  it("routes home from memory", () => {
    expect(homeStep(base)).toBe("gate");
    expect(homeStep({ ...base, adultConfirmed: true })).toBe("landing");
    expect(homeStep({ ...base, adultConfirmed: true, landingComplete: true })).toBe("sanctuary");
    expect(canEnterRoom({ ...base, adultConfirmed: true, landingComplete: true })).toBe(true);
    expect(canEnterRoom({ ...base, adultConfirmed: true })).toBe(false);
  });
});
