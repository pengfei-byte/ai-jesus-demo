export const MEMORY_KEY = "ai-jesus.memory";

export type Mode = "confess" | "pray" | "talk" | "meet";

export type Exchange = {
  mode: Mode;
  at: string;
  user: string;
  jesus: string;
};

export type Memory = {
  adultConfirmed: boolean;
  landingComplete: boolean;
  name: string;
  hope: string;
  portrait: string;
  recent: Exchange[];
};

export const EMPTY_MEMORY: Memory = {
  adultConfirmed: false,
  landingComplete: false,
  name: "",
  hope: "",
  portrait: "",
  recent: [],
};

const CLIP = 280;
const MAX_RECENT = 8;
const MAX_PORTRAIT_WORDS = 80;

export function trimWords(text: string, maxWords = MAX_PORTRAIT_WORDS): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

export function appendExchange(memory: Memory, exchange: Exchange): Memory {
  const recent = [
    ...memory.recent,
    { ...exchange, user: exchange.user.slice(0, CLIP), jesus: exchange.jesus.slice(0, CLIP) },
  ].slice(-MAX_RECENT);
  return { ...memory, recent };
}

export function withPortrait(memory: Memory, portrait: string): Memory {
  return { ...memory, portrait: trimWords(portrait) };
}

export function foldPortrait(portrait: string, userText: string): string {
  const addition = userText.trim().replace(/\s+/g, " ");
  const combined = [portrait.trim(), addition].filter(Boolean).join(" ");
  return trimWords(combined);
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readMemory(store: KeyValueStore): Memory {
  const raw = store.getItem(MEMORY_KEY);
  if (!raw) return { ...EMPTY_MEMORY, recent: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<Memory>;
    return {
      adultConfirmed: Boolean(parsed.adultConfirmed),
      landingComplete: Boolean(parsed.landingComplete),
      name: typeof parsed.name === "string" ? parsed.name : "",
      hope: typeof parsed.hope === "string" ? parsed.hope : "",
      portrait: typeof parsed.portrait === "string" ? parsed.portrait : "",
      recent: Array.isArray(parsed.recent) ? parsed.recent.slice(-MAX_RECENT) : [],
    };
  } catch {
    return { ...EMPTY_MEMORY, recent: [] };
  }
}

export function writeMemory(store: KeyValueStore, memory: Memory): void {
  store.setItem(MEMORY_KEY, JSON.stringify(memory));
}

export function forgetMemory(store: KeyValueStore): void {
  store.removeItem(MEMORY_KEY);
}

export function homeStep(memory: Memory): "gate" | "landing" | "sanctuary" {
  if (!memory.adultConfirmed) return "gate";
  if (!memory.landingComplete) return "landing";
  return "sanctuary";
}

export function canEnterRoom(memory: Memory): boolean {
  return memory.adultConfirmed && memory.landingComplete;
}
