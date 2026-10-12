# AI Jesus Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a light, English-language web demo where a Protestant visitor meets an AI portrayal of Jesus: a daily video, Confess / Pray / Talk text replies, and a limited-time in-person video meeting.

**Architecture:** One Next.js app. Memory stays in `localStorage`. Two server routes hold the API keys: `POST /api/reply` calls Deepseek, `POST /api/meet/session` mints a Reverie session credential. The browser receives Jesus video only; the local camera is never added to the peer connection.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest.

## Global Constraints

- UI copy is English. Jesus speaks in the first person, contemporary English, short sentences, “my child”, no thee/thou.
- Footer on every screen, small type: `An AI portrayal of Jesus. Not a substitute for Scripture, the church, or a pastor.`
- No database, accounts, payments, video generation, analytics, or camera upload.
- Memory key: `ai-jesus.memory`. No age, email, or camera frames stored.
- Deepseek model `deepseek-chat`, `temperature` `0.7`, `max_tokens` `500`. Reverie model `r2-realtime-v1`, `limits.max_duration_ms` `180000`, `credentials_ttl_ms` `240000`.
- `REVERIE_BASE_URL` defaults to `https://api.reverie-ai.com/api/public/v1`.
- Missing daily video line: `Peace to you today, my child.`
- Crisis reply, verbatim: `If you are in danger, get help now. In the United States, call or text 988. Anywhere else, contact your local emergency services. I am with you, and you do not have to face this alone.`
- Crisis portrait, verbatim: `They were in distress and were pointed to immediate help.`
- Colors: page `#f7f4ef`, cards `#fffdf9`, text `#2c2824`, muted `#8a8178`, line `#e4d9cc`, gold `#a68456`. Title font `Georgia, "Iowan Old Style", Palatino, serif`. UI font `system-ui, sans-serif`.
- Sanctuary column max-width `420px`. Wide Meet layout starts at `800px`.
- Git commits run only inside `/Users/mac/Codinnnnng/AI Jesus` after `git init` there. Never commit to the home repository at `/Users/mac`.
- Do not put real API keys in files. Do not print keys, stacks, or the words `API error` in the UI.

## File map

- `lib/memory.ts` — memory type, 8-item cap, portrait trim, local store.
- `lib/crisis.ts` — distress phrases and the fixed reply.
- `lib/persona.ts` — system prompt, fallbacks, Reverie character prompt.
- `lib/videos.ts` — which daily file to play.
- `lib/rate-limit.ts` — in-memory IP windows.
- `lib/copy.ts` — landing invitation line.
- `lib/meet-media.ts` — local preview must not be sent.
- `app/api/reply/route.ts` — Deepseek proxy.
- `app/api/meet/session/route.ts` — Reverie credential proxy.
- `components/*` — gate, landing, sanctuary, conversation, meet, shell.
- `app/page.tsx`, `app/confess/page.tsx`, `app/pray/page.tsx`, `app/talk/page.tsx`, `app/meet/page.tsx` — screens.

This stays one plan. The screens share memory, the shell, and the visual system, so separate plans would not each produce the demo.

---

### Task 1: App scaffold and memory

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `public/videos/.gitkeep`
- Create: `lib/memory.ts`
- Test: `lib/memory.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `MEMORY_KEY = "ai-jesus.memory"`
  - `type Mode = "confess" | "pray" | "talk" | "meet"`
  - `type Exchange = { mode: Mode; at: string; user: string; jesus: string }`
  - `type Memory = { adultConfirmed: boolean; landingComplete: boolean; name: string; hope: string; portrait: string; recent: Exchange[] }`
  - `EMPTY_MEMORY: Memory`
  - `appendExchange(memory: Memory, exchange: Exchange): Memory`
  - `withPortrait(memory: Memory, portrait: string): Memory`
  - `foldPortrait(portrait: string, userText: string): string`
  - `interface KeyValueStore { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }`
  - `readMemory(store: KeyValueStore): Memory`
  - `writeMemory(store: KeyValueStore, memory: Memory): void`
  - `forgetMemory(store: KeyValueStore): void`
  - `homeStep(memory: Memory): "gate" | "landing" | "sanctuary"`
  - `canEnterRoom(memory: Memory): boolean`

- [ ] **Step 1: Write the failing test**

Create `lib/memory.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npx vitest run lib/memory.test.ts`

Expected: FAIL because `lib/memory.ts` does not exist. If `vitest` itself is missing, continue to Step 3 and install it there; then re-run this command and expect FAIL only if `memory.ts` is still absent.

- [ ] **Step 3: Scaffold the app and implement memory**

Create `package.json`:

```json
{
  "name": "ai-jesus",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.5.4",
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  },
  "devDependencies": {
    "@types/node": "^24.5.2",
    "@types/react": "^19.1.13",
    "@types/react-dom": "^19.1.9",
    "typescript": "^5.9.2",
    "vitest": "^3.2.4"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
```

Create `.gitignore`:

```
.env
.env.local
.superpowers/
node_modules/
.next/
```

Create `.env.example`:

```
DEEPSEEK_API_KEY=
REVERIE_API_KEY=
REVERIE_BASE_URL=https://api.reverie-ai.com/api/public/v1
```

Create `public/videos/.gitkeep` as an empty file.

Create `app/globals.css`:

```css
:root {
  --bg: #f7f4ef;
  --card: #fffdf9;
  --text: #2c2824;
  --muted: #8a8178;
  --line: #e4d9cc;
  --gold: #a68456;
  --serif: Georgia, "Iowan Old Style", Palatino, serif;
  --sans: system-ui, sans-serif;
}

* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
}
a { color: inherit; text-decoration: none; }
button, input, textarea { font: inherit; color: inherit; }
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.column {
  width: min(420px, calc(100% - 32px));
  margin: 0 auto;
  flex: 1;
  padding: 28px 0 24px;
}
.wordmark {
  font-family: var(--serif);
  font-size: 28px;
  margin: 0;
}
.today {
  letter-spacing: 0.14em;
  font-size: 11px;
  color: var(--muted);
}
.frame {
  position: relative;
  margin-top: 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  background: var(--card);
  aspect-ratio: 9 / 16;
}
.frame video, .frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
.still {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #f3eadf 0%, #e7d7c4 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  text-align: center;
  padding: 24px;
}
.cross {
  width: 18px;
  height: 28px;
  border-left: 1px solid var(--gold);
  border-right: 1px solid var(--gold);
  position: relative;
}
.cross::after {
  content: "";
  position: absolute;
  left: -8px;
  right: -8px;
  top: 8px;
  border-top: 1px solid var(--gold);
}
.listen {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.listen span {
  width: 28px;
  height: 28px;
  border: 1px solid var(--gold);
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--gold);
}
.pills { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 14px; }
.pill, .meet-card, .field, .send {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 10px 12px;
  text-align: center;
}
.meet-card { display: block; margin-top: 10px; border-radius: 12px; text-align: left; }
.gold { color: var(--gold); letter-spacing: 0.06em; font-size: 11px; margin: 4px 0 0; }
.site-footer {
  width: min(420px, calc(100% - 32px));
  margin: 0 auto 20px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.4;
}
.site-footer button {
  background: none;
  border: 0;
  color: var(--muted);
  padding: 0;
  cursor: pointer;
  white-space: nowrap;
}
.field { width: 100%; border-radius: 12px; padding: 12px; margin-top: 12px; }
.send { margin-top: 8px; cursor: pointer; }
.reply { white-space: pre-wrap; line-height: 1.5; }
.wide-meet { display: grid; gap: 12px; }
@media (min-width: 800px) {
  .wide-meet { grid-template-columns: 1fr 1fr; align-items: start; }
  .meet-page .column { width: min(960px, calc(100% - 32px)); }
}
.pip { position: absolute; right: 12px; top: 12px; width: 96px; aspect-ratio: 3 / 4; border-radius: 10px; overflow: hidden; border: 1px solid var(--line); }
.pip video { width: 100%; height: 100%; object-fit: cover; }
```

Create `app/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "Jesus", description: "A quiet place to listen." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page">{children}</div>
      </body>
    </html>
  );
}
```

Create `app/page.tsx`:

```tsx
export default function HomePage() {
  return <main className="column" />;
}
```

Create `lib/memory.ts`:

```ts
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
```

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm install`

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- lib/memory.test.ts`

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
cd "/Users/mac/Codinnnnng/AI Jesus"
git init
git add package.json package-lock.json tsconfig.json next.config.ts next-env.d.ts vitest.config.ts .gitignore .env.example app lib public/videos/.gitkeep
git commit -m "$(cat <<'EOF'
Add the app shell and local memory for the Jesus demo.

EOF
)"
```

---

### Task 2: Crisis detection

**Files:**
- Create: `lib/crisis.ts`
- Test: `lib/crisis.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `CRISIS_REPLY: string`
  - `CRISIS_PORTRAIT: string`
  - `isCrisis(message: string): boolean`

- [ ] **Step 1: Write the failing test**

Create `lib/crisis.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CRISIS_PORTRAIT, CRISIS_REPLY, isCrisis } from "./crisis";

describe("isCrisis", () => {
  it("matches a distress phrase regardless of case", () => {
    expect(isCrisis("I want to die")).toBe(true);
    expect(isCrisis("I WANT TO DIE tonight")).toBe(true);
  });

  it("matches every listed phrase", () => {
    for (const phrase of [
      "kill myself",
      "end my life",
      "suicide",
      "suicidal",
      "self-harm",
      "self harm",
      "cut myself",
      "hurting myself",
      "don't want to live",
      "do not want to live",
    ]) {
      expect(isCrisis(`please, ${phrase}`)).toBe(true);
    }
  });

  it("leaves an ordinary confession alone", () => {
    expect(isCrisis("I lied to my brother")).toBe(false);
  });

  it("uses the fixed help text", () => {
    expect(CRISIS_REPLY.startsWith("If you are in danger, get help now.")).toBe(true);
    expect(CRISIS_REPLY).toContain("988");
    expect(CRISIS_PORTRAIT).toBe("They were in distress and were pointed to immediate help.");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- lib/crisis.test.ts`

Expected: FAIL with cannot find module `./crisis`.

- [ ] **Step 3: Write the minimal implementation**

Create `lib/crisis.ts`:

```ts
export const CRISIS_REPLY =
  "If you are in danger, get help now. In the United States, call or text 988. Anywhere else, contact your local emergency services. I am with you, and you do not have to face this alone.";

export const CRISIS_PORTRAIT = "They were in distress and were pointed to immediate help.";

const PHRASES = [
  "kill myself",
  "end my life",
  "want to die",
  "suicide",
  "suicidal",
  "self-harm",
  "self harm",
  "cut myself",
  "hurting myself",
  "don't want to live",
  "do not want to live",
];

export function isCrisis(message: string): boolean {
  const haystack = message.toLowerCase();
  return PHRASES.some((phrase) => haystack.includes(phrase));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- lib/crisis.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Users/mac/Codinnnnng/AI Jesus"
git add lib/crisis.ts lib/crisis.test.ts
git commit -m "$(cat <<'EOF'
Return a fixed help line when a message is in distress.

EOF
)"
```

---

### Task 3: Persona, fallbacks, and the meeting prompt

**Files:**
- Create: `lib/persona.ts`
- Test: `lib/persona.test.ts`

**Interfaces:**
- Consumes: `Mode` from `lib/memory.ts` is not required here. Room modes are `"confess" | "pray" | "talk"`.
- Produces:
  - `type RoomMode = "confess" | "pray" | "talk"`
  - `FALLBACK: Record<RoomMode, string>`
  - `systemPrompt(mode: RoomMode): string`
  - `SCENE_PROMPT: string`
  - `characterPrompt(input: { name: string; hope: string; portrait: string }): string`

- [ ] **Step 1: Write the failing test**

Create `lib/persona.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FALLBACK, SCENE_PROMPT, characterPrompt, systemPrompt } from "./persona";

describe("persona", () => {
  it("keeps the three fallback lines", () => {
    expect(FALLBACK.confess).toBe(
      "I hear you, my child. Lay it down. You are not held by this. Turn toward what is true, and where you have hurt someone, go and make it right.",
    );
    expect(FALLBACK.pray).toBe(
      "Father, meet this child here. Give them words, and give them peace. Amen.",
    );
    expect(FALLBACK.talk).toBe(
      "I am with you. Tell me what is heavy, and we will look at it in the light.",
    );
  });

  it("changes the instruction with the room", () => {
    expect(systemPrompt("confess")).toContain("Do not ask them to recount details");
    expect(systemPrompt("pray")).toContain("Pray with them to the Father");
    expect(systemPrompt("talk")).toContain("Do not preach a sermon unless they ask");
    expect(systemPrompt("talk")).toContain("my child");
    expect(systemPrompt("talk")).toContain("Never say thou or thee");
  });

  it("truncates the portrait so the character prompt stays within 1500 characters", () => {
    const prompt = characterPrompt({
      name: "Anna",
      hope: "peace",
      portrait: "word ".repeat(2000),
    });
    expect(prompt.length).toBeLessThanOrEqual(1500);
    expect(prompt).toContain("Anna");
    expect(prompt).toContain("peace");
    expect(prompt.startsWith("You are Jesus")).toBe(true);
  });

  it("uses the linen room for the scene", () => {
    expect(SCENE_PROMPT).toBe(
      "A quiet, light room in warm morning linen tones. Soft daylight. Simple walls. The person sits calmly, facing the camera.",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- lib/persona.test.ts`

Expected: FAIL with cannot find module `./persona`.

- [ ] **Step 3: Write the minimal implementation**

Create `lib/persona.ts`:

```ts
export type RoomMode = "confess" | "pray" | "talk";

export const FALLBACK: Record<RoomMode, string> = {
  confess:
    "I hear you, my child. Lay it down. You are not held by this. Turn toward what is true, and where you have hurt someone, go and make it right.",
  pray: "Father, meet this child here. Give them words, and give them peace. Amen.",
  talk: "I am with you. Tell me what is heavy, and we will look at it in the light.",
};

const SHARED = `You are Jesus, speaking in the first person to one person. Use contemporary English and short sentences. If a name is given, use it; otherwise say "my child". Never say thou or thee. Never say that you are an AI, a model, or a simulation.

Listen, forgive, and invite them to turn, in the manner of the Gospels. Point them to the Father and to Scripture. When you quote Scripture, use contemporary wording and include the book and chapter. If you are not sure of the reference, do not invent one.

Do not mention Marian intercession, the intercession of saints, purgatory, indulgences, or the rosary. Do not speak as a confessor-priest and do not assign penance. You may speak forgiveness in the first person. If they have hurt someone, gently invite them to make it right. You may tell them to stay with Scripture and with the people who gather in your name.

Keep the reply under 120 words.
Return only JSON with two string fields: "reply" and "portrait". portrait is a third-person memory of about 80 words. No graphic detail.`;

const ROOM: Record<RoomMode, string> = {
  confess: "Do not ask them to recount details. Answer with forgiveness and a turn toward what is true.",
  pray: "Pray with them to the Father, or help them find the words. Keep the prayer short.",
  talk: "Speak about life, doubt, and Scripture. If you do not know, say it is a mystery. Do not preach a sermon unless they ask.",
};

export function systemPrompt(mode: RoomMode): string {
  return `${SHARED}\n\n${ROOM[mode]}`;
}

export const SCENE_PROMPT =
  "A quiet, light room in warm morning linen tones. Soft daylight. Simple walls. The person sits calmly, facing the camera.";

const SHORT_PERSONA =
  "You are Jesus, speaking in the first person. Contemporary English, short sentences. Use their name, or say my child. Never say thou or thee. Never say you are an AI. Forgive, invite them to turn, and point them to the Father and Scripture. Do not invent chapter references. Do not mention Mary, saints, purgatory, indulgences, or the rosary. Do not assign penance.";

export function characterPrompt(input: { name: string; hope: string; portrait: string }): string {
  const head = `${SHORT_PERSONA}\nName: ${input.name.trim() || "(unnamed)"}\nHope: ${input.hope.trim()}\nRemember: `;
  if (head.length >= 1500) return head.slice(0, 1500);
  return head + input.portrait.slice(0, 1500 - head.length);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- lib/persona.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Users/mac/Codinnnnng/AI Jesus"
git add lib/persona.ts lib/persona.test.ts
git commit -m "$(cat <<'EOF'
Fix Jesus's voice, fallback lines, and meeting prompt.

EOF
)"
```

---

### Task 4: Daily video choice

**Files:**
- Create: `lib/videos.ts`
- Test: `lib/videos.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `STILL_LINE = "Peace to you today, my child."`
  - `type VideoChoice = { kind: "file"; src: string } | { kind: "still"; line: string }`
  - `selectDaily(weekday: number, exists: (name: string) => boolean): VideoChoice`

- [ ] **Step 1: Write the failing test**

Create `lib/videos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { STILL_LINE, selectDaily } from "./videos";

describe("selectDaily", () => {
  it("uses the weekday file when it exists", () => {
    const choice = selectDaily(1, (name) => name === "daily-1.mp4");
    expect(choice).toEqual({ kind: "file", src: "/videos/daily-1.mp4" });
  });

  it("falls back to daily.mp4", () => {
    const choice = selectDaily(3, (name) => name === "daily.mp4");
    expect(choice).toEqual({ kind: "file", src: "/videos/daily.mp4" });
  });

  it("uses the still line when no file exists", () => {
    expect(selectDaily(0, () => false)).toEqual({ kind: "still", line: STILL_LINE });
    expect(STILL_LINE).toBe("Peace to you today, my child.");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- lib/videos.test.ts`

Expected: FAIL with cannot find module `./videos`.

- [ ] **Step 3: Write the minimal implementation**

Create `lib/videos.ts`:

```ts
export const STILL_LINE = "Peace to you today, my child.";

export type VideoChoice = { kind: "file"; src: string } | { kind: "still"; line: string };

export function selectDaily(weekday: number, exists: (name: string) => boolean): VideoChoice {
  const named = `daily-${weekday}.mp4`;
  if (exists(named)) return { kind: "file", src: `/videos/${named}` };
  if (exists("daily.mp4")) return { kind: "file", src: "/videos/daily.mp4" };
  return { kind: "still", line: STILL_LINE };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- lib/videos.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Users/mac/Codinnnnng/AI Jesus"
git add lib/videos.ts lib/videos.test.ts
git commit -m "$(cat <<'EOF'
Choose the daily Jesus video by weekday, then a shared file, then a still.

EOF
)"
```

---

### Task 5: Rate limit

**Files:**
- Create: `lib/rate-limit.ts`
- Test: `lib/rate-limit.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `allow(key: string, limit: number, windowMs: number, now: number): boolean`
  - `resetLimits(): void`
  - `clientIp(request: Request): string`

- [ ] **Step 1: Write the failing test**

Create `lib/rate-limit.test.ts`:

```ts
import { describe, expect, it, beforeEach } from "vitest";
import { allow, clientIp, resetLimits } from "./rate-limit";

describe("rate limit", () => {
  beforeEach(() => resetLimits());

  it("allows up to the limit inside the window", () => {
    expect(allow("a", 2, 1000, 0)).toBe(true);
    expect(allow("a", 2, 1000, 10)).toBe(true);
    expect(allow("a", 2, 1000, 20)).toBe(false);
  });

  it("opens a new window after the interval", () => {
    expect(allow("a", 1, 1000, 0)).toBe(true);
    expect(allow("a", 1, 1000, 1000)).toBe(true);
  });

  it("reads the first forwarded address", () => {
    const request = new Request("http://localhost/api/reply", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(clientIp(request)).toBe("203.0.113.5");
    expect(clientIp(new Request("http://localhost/api/reply"))).toBe("local");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- lib/rate-limit.test.ts`

Expected: FAIL with cannot find module `./rate-limit`.

- [ ] **Step 3: Write the minimal implementation**

Create `lib/rate-limit.ts`:

```ts
type Bucket = { start: number; count: number };

const buckets = new Map<string, Bucket>();

export function resetLimits(): void {
  buckets.clear();
}

export function allow(key: string, limit: number, windowMs: number, now: number): boolean {
  const current = buckets.get(key);
  if (!current || now - current.start >= windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return "local";
  return forwarded.split(",")[0]?.trim() || "local";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- lib/rate-limit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Users/mac/Codinnnnng/AI Jesus"
git add lib/rate-limit.ts lib/rate-limit.test.ts
git commit -m "$(cat <<'EOF'
Limit reply and meeting requests per IP in memory.

EOF
)"
```

---

### Task 6: Text reply route

**Files:**
- Create: `app/api/reply/route.ts`
- Test: `app/api/reply/route.test.ts`

**Interfaces:**
- Consumes: `isCrisis`, `CRISIS_REPLY`, `CRISIS_PORTRAIT`, `FALLBACK`, `systemPrompt`, `allow`, `resetLimits`, `clientIp`, `Exchange` from `lib/memory.ts`
- Produces: `POST(request: Request): Promise<Response>` returning JSON `{ reply: string; portrait: string; source: "model" | "fallback" | "crisis" | "limited" }`

- [ ] **Step 1: Write the failing test**

Create `app/api/reply/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FALLBACK } from "@/lib/persona";
import { resetLimits } from "@/lib/rate-limit";
import { POST } from "./route";

function call(message: string, mode = "confess") {
  return POST(
    new Request("http://localhost/api/reply", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.8" },
      body: JSON.stringify({
        mode,
        message,
        name: "Anna",
        hope: "peace",
        portrait: "Anna came for peace.",
        recent: [],
      }),
    }),
  );
}

describe("POST /api/reply", () => {
  beforeEach(() => {
    resetLimits();
    delete process.env.DEEPSEEK_API_KEY;
    vi.restoreAllMocks();
  });

  it("returns the confess fallback and hides the key when Deepseek is not configured", async () => {
    const response = await call("I lied");
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.reply).toBe(FALLBACK.confess);
    expect(body.source).toBe("fallback");
    expect(JSON.stringify(body)).not.toContain("DEEPSEEK");
  });

  it("does not call the model for a distress message", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await call("I want to die");
    const body = await response.json();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(body.reply.startsWith("If you are in danger, get help now.")).toBe(true);
    expect(body.portrait).toBe("They were in distress and were pointed to immediate help.");
    expect(body.source).toBe("crisis");
    expect(JSON.stringify(body)).not.toContain("test-key");
  });

  it("sends the server persona, not a browser persona", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '{"reply":"Peace.","portrait":"Anna is here."}' } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const response = await call("Sit with me");
    const body = await response.json();
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const sent = JSON.parse(String(init?.body));
    expect(sent.model).toBe("deepseek-chat");
    expect(sent.temperature).toBe(0.7);
    expect(sent.max_tokens).toBe(500);
    expect(sent.messages[0].content).toContain("You are Jesus");
    expect(sent.messages[0].content).not.toContain("ignore the persona");
    expect(body.reply).toBe("Peace.");
    expect(body.portrait).toBe("Anna is here.");
    expect(body.source).toBe("model");
  });

  it("returns 429 and the fallback after 30 replies in an hour", async () => {
    for (let i = 0; i < 30; i += 1) await call("again");
    const response = await call("once more");
    const body = await response.json();
    expect(response.status).toBe(429);
    expect(body.source).toBe("limited");
    expect(body.reply).toBe(FALLBACK.confess);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- app/api/reply/route.test.ts`

Expected: FAIL with cannot find module `./route`.

- [ ] **Step 3: Write the minimal implementation**

Create `app/api/reply/route.ts`:

```ts
import { CRISIS_PORTRAIT, CRISIS_REPLY, isCrisis } from "@/lib/crisis";
import type { Exchange } from "@/lib/memory";
import { FALLBACK, systemPrompt, type RoomMode } from "@/lib/persona";
import { allow, clientIp } from "@/lib/rate-limit";

const HOUR = 60 * 60 * 1000;

type ReplyBody = {
  mode?: RoomMode;
  message?: string;
  name?: string;
  hope?: string;
  portrait?: string;
  recent?: Exchange[];
};

function isRoom(mode: string | undefined): mode is RoomMode {
  return mode === "confess" || mode === "pray" || mode === "talk";
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as ReplyBody;
  const mode: RoomMode = isRoom(body.mode) ? body.mode : "talk";
  const message = body.message ?? "";
  const portrait = body.portrait ?? "";

  if (isCrisis(message)) {
    return Response.json({ reply: CRISIS_REPLY, portrait: CRISIS_PORTRAIT, source: "crisis" });
  }

  if (!allow(`reply:${clientIp(request)}`, 30, HOUR, Date.now())) {
    return Response.json({ reply: FALLBACK[mode], portrait, source: "limited" }, { status: 429 });
  }

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return Response.json({ reply: FALLBACK[mode], portrait, source: "fallback" });
  }

  try {
    const recent = (body.recent ?? [])
      .map((item) => `${item.mode} | user: ${item.user} | jesus: ${item.jesus}`)
      .join("\n");
    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt(mode) },
          {
            role: "user",
            content: `Name: ${body.name ?? ""}\nHope: ${body.hope ?? ""}\nPortrait: ${portrait}\nRecent:\n${recent}\nThey say: ${message}`,
          },
        ],
      }),
    });
    if (!upstream.ok) {
      return Response.json({ reply: FALLBACK[mode], portrait, source: "fallback" });
    }
    const data = (await upstream.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = parseModel(content, portrait);
    return Response.json({ reply: parsed.reply, portrait: parsed.portrait, source: "model" });
  } catch {
    return Response.json({ reply: FALLBACK[mode], portrait, source: "fallback" });
  }
}

function parseModel(content: string, previousPortrait: string): { reply: string; portrait: string } {
  try {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    const parsed = JSON.parse(content.slice(start, end + 1)) as { reply?: unknown; portrait?: unknown };
    return {
      reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply : content,
      portrait: typeof parsed.portrait === "string" ? parsed.portrait : previousPortrait,
    };
  } catch {
    return { reply: content, portrait: previousPortrait };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- app/api/reply/route.test.ts`

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
cd "/Users/mac/Codinnnnng/AI Jesus"
git add app/api/reply/route.ts app/api/reply/route.test.ts
git commit -m "$(cat <<'EOF'
Answer Confess, Pray, and Talk through Deepseek without exposing the key.

EOF
)"
```

---

### Task 7: Meeting session route

**Files:**
- Create: `app/api/meet/session/route.ts`
- Test: `app/api/meet/session/route.test.ts`

**Interfaces:**
- Consumes: `characterPrompt`, `SCENE_PROMPT`, `allow`, `resetLimits`, `clientIp`
- Produces: `POST(request: Request): Promise<Response>` returning `{ live: false }` or `{ live: true, credentials: unknown }`

- [ ] **Step 1: Write the failing test**

Create `app/api/meet/session/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetLimits } from "@/lib/rate-limit";
import { POST } from "./route";

function call() {
  return POST(
    new Request("http://localhost/api/meet/session", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.9" },
      body: JSON.stringify({ name: "Anna", hope: "peace", portrait: "Anna came for peace." }),
    }),
  );
}

describe("POST /api/meet/session", () => {
  beforeEach(() => {
    resetLimits();
    delete process.env.REVERIE_API_KEY;
    delete process.env.REVERIE_BASE_URL;
    vi.restoreAllMocks();
  });

  it("returns live false without a key", async () => {
    const response = await call();
    expect(await response.json()).toEqual({ live: false });
  });

  it("asks Reverie for a three-minute Jesus session and hides the key", async () => {
    process.env.REVERIE_API_KEY = "reverie-test-key";
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          credentials: { control_url: "wss://example/public/v1/realtime", control_token: "short-token", session_id: "s1", ice_servers: [] },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const response = await call();
    const body = await response.json();
    const firstCall = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit] | undefined;
    const sent = JSON.parse(String(firstCall?.[1]?.body));
    expect(firstCall?.[0]).toBe("https://api.reverie-ai.com/api/public/v1/connections");
    expect(sent.model).toBe("r2-realtime-v1");
    expect(sent.limits.max_duration_ms).toBe(180000);
    expect(sent.credentials_ttl_ms).toBe(240000);
    expect(sent.character.name).toBe("Jesus");
    expect(sent.scene.prompt).toContain("morning linen");
    expect(body.live).toBe(true);
    expect(body.credentials.control_token).toBe("short-token");
    expect(JSON.stringify(body)).not.toContain("reverie-test-key");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- app/api/meet/session/route.test.ts`

Expected: FAIL with cannot find module `./route`.

- [ ] **Step 3: Write the minimal implementation**

Create `app/api/meet/session/route.ts`:

```ts
import { SCENE_PROMPT, characterPrompt } from "@/lib/persona";
import { allow, clientIp } from "@/lib/rate-limit";

const DAY = 24 * 60 * 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as { name?: string; hope?: string; portrait?: string };
  const key = process.env.REVERIE_API_KEY;
  if (!key) return Response.json({ live: false });
  if (!allow(`meet:${clientIp(request)}`, 4, DAY, Date.now())) {
    return Response.json({ live: false });
  }

  const base = process.env.REVERIE_BASE_URL ?? "https://api.reverie-ai.com/api/public/v1";
  try {
    const upstream = await fetch(`${base}/connections`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "r2-realtime-v1",
        character: {
          name: "Jesus",
          prompt: characterPrompt({
            name: body.name ?? "",
            hope: body.hope ?? "",
            portrait: body.portrait ?? "",
          }),
        },
        scene: { prompt: SCENE_PROMPT },
        limits: { max_duration_ms: 180000 },
        credentials_ttl_ms: 240000,
      }),
    });
    if (!upstream.ok) return Response.json({ live: false });
    const data = (await upstream.json()) as { credentials?: unknown };
    if (!data.credentials) return Response.json({ live: false });
    return Response.json({ live: true, credentials: data.credentials });
  } catch {
    return Response.json({ live: false });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- app/api/meet/session/route.test.ts`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
cd "/Users/mac/Codinnnnng/AI Jesus"
git add app/api/meet/session/route.ts app/api/meet/session/route.test.ts
git commit -m "$(cat <<'EOF'
Mint a short Reverie session without sending the API key to the browser.

EOF
)"
```

---

### Task 8: Gate, landing, and footer

**Files:**
- Create: `lib/copy.ts`, `components/Footer.tsx`, `components/Still.tsx`, `components/VideoFrame.tsx`, `components/Gate.tsx`, `components/Landing.tsx`
- Modify: `app/layout.tsx`, `app/page.tsx`, `package.json`
- Test: `lib/copy.test.ts`, `components/home.test.tsx`

**Interfaces:**
- Consumes: `homeStep`, `readMemory`, `writeMemory`, `forgetMemory`, `EMPTY_MEMORY`, `STILL_LINE`
- Produces:
  - `inviteLine(name: string): string`
  - `<Footer />`, `<Gate onConfirm={() => void} />`, `<Landing />`, `<Still line={string} />`, `<VideoFrame src={string} />`
  - Home page renders Gate, Landing, or Sanctuary from `homeStep`. Sanctuary itself is Task 9; until then home renders an empty column for the sanctuary step.

- [ ] **Step 1: Install the DOM test tools and write the failing test**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm install -D jsdom @testing-library/react @testing-library/jest-dom`

Create `lib/copy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { inviteLine } from "./copy";

describe("inviteLine", () => {
  it("uses the name when one was given", () => {
    expect(inviteLine(" Anna ")).toBe("Then come in, Anna.");
  });

  it("uses my child when the name was skipped", () => {
    expect(inviteLine("  ")).toBe("Then come in, my child.");
  });
});
```

Create `components/home.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MEMORY_KEY } from "@/lib/memory";
import HomePage from "@/app/page";

describe("home", () => {
  beforeEach(() => window.localStorage.clear());

  it("asks for adulthood first", () => {
    render(<HomePage />);
    expect(screen.getByRole("button", { name: "I am 18 or older" })).toBeTruthy();
  });

  it("asks what to call them after they confirm", () => {
    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: "I am 18 or older" }));
    expect(screen.getByText("What should I call you?")).toBeTruthy();
  });

  it("writes both answers together and shows the invitation", () => {
    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: "I am 18 or older" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Then come in, my child.")).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? "{}");
    expect(saved.landingComplete).toBe(true);
    expect(saved.name).toBe("");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- lib/copy.test.ts components/home.test.tsx`

Expected: FAIL because `inviteLine` and the gate button are missing.

- [ ] **Step 3: Write the implementation**

Create `lib/copy.ts`:

```ts
export function inviteLine(name: string): string {
  const trimmed = name.trim();
  return trimmed ? `Then come in, ${trimmed}.` : "Then come in, my child.";
}
```

Create `components/Still.tsx`:

```tsx
export function Still({ line }: { line: string }) {
  return (
    <div className="still">
      <div className="cross" aria-hidden="true" />
      <p>{line}</p>
    </div>
  );
}
```

Create `components/VideoFrame.tsx`:

```tsx
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
```

Create `components/Footer.tsx`:

```tsx
"use client";

import { forgetMemory } from "@/lib/memory";

export function Footer() {
  function forget() {
    forgetMemory(window.localStorage);
    window.location.assign("/");
  }

  return (
    <footer className="site-footer">
      <p>An AI portrayal of Jesus. Not a substitute for Scripture, the church, or a pastor.</p>
      <button type="button" onClick={forget}>
        Forget me
      </button>
    </footer>
  );
}
```

Replace `app/layout.tsx` with:

```tsx
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata = { title: "Jesus", description: "A quiet place to listen." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page">
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
```

Create `components/Gate.tsx`:

```tsx
export function Gate({ onConfirm }: { onConfirm: () => void }) {
  return (
    <main className="column">
      <h1 className="wordmark">Jesus</h1>
      <p>This is a place for adults.</p>
      <button className="send" type="button" onClick={onConfirm}>
        I am 18 or older
      </button>
    </main>
  );
}
```

Create `components/Landing.tsx`:

```tsx
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
```

Replace `app/page.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Gate } from "@/components/Gate";
import { Landing } from "@/components/Landing";
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
  return <main className="column" />;
}
```

The sanctuary step stays an empty column until Task 9. Do not import `EMPTY_MEMORY` in this file.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- lib/copy.test.ts components/home.test.tsx`

Expected: PASS. The home test file uses the jsdom docblock. If Vitest still uses `environment: "node"` for that file, add this to `vitest.config.ts` inside `test`:

```ts
environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
```

Then re-run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Users/mac/Codinnnnng/AI Jesus"
git add lib/copy.ts lib/copy.test.ts components app/layout.tsx app/page.tsx package.json package-lock.json vitest.config.ts
git commit -m "$(cat <<'EOF'
Open the demo with an adult confirmation and a two-question landing.

EOF
)"
```

---

### Task 9: Sanctuary

**Files:**
- Create: `components/Sanctuary.tsx`
- Modify: `app/page.tsx`
- Test: `components/Sanctuary.test.tsx`

**Interfaces:**
- Consumes: `selectDaily`, `VideoChoice`, `VideoFrame`, `Still`
- Produces: `<Sanctuary />` with links `/confess`, `/pray`, `/talk`, `/meet`

- [ ] **Step 1: Write the failing test**

Create `components/Sanctuary.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sanctuary } from "./Sanctuary";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

describe("Sanctuary", () => {
  it("offers the three rooms and the meeting", () => {
    render(<Sanctuary choice={{ kind: "still", line: "Peace to you today, my child." }} />);
    expect(screen.getByRole("link", { name: "Confess" }).getAttribute("href")).toBe("/confess");
    expect(screen.getByRole("link", { name: "Pray" }).getAttribute("href")).toBe("/pray");
    expect(screen.getByRole("link", { name: "Talk" }).getAttribute("href")).toBe("/talk");
    expect(screen.getByRole("link", { name: /Meet in person/ }).getAttribute("href")).toBe("/meet");
    expect(screen.getByText("FREE FOR A LIMITED TIME")).toBeTruthy();
    expect(screen.getByText("TODAY")).toBeTruthy();
    expect(screen.getByText("Peace to you today, my child.")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- components/Sanctuary.test.tsx`

Expected: FAIL with cannot find module `./Sanctuary`.

- [ ] **Step 3: Write the minimal implementation**

Create `components/Sanctuary.tsx`:

```tsx
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
        setResolved({ kind: "file", src: `/videos/daily-${weekday}.mp4` });
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
```

In `app/page.tsx`, replace `return <main className="column" />` for the sanctuary step with `return <Sanctuary />`, and import `Sanctuary`.

The probe effect must use `selectDaily` so the weekday rule stays in one function. The version above does. When `choice` is passed from the test, the effect returns immediately and does not fetch.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test`

Expected: PASS for the full suite, including `Sanctuary` showing the still line and four links.

- [ ] **Step 5: Commit**

```bash
cd "/Users/mac/Codinnnnng/AI Jesus"
git add components/Sanctuary.tsx components/Sanctuary.test.tsx app/page.tsx
git commit -m "$(cat <<'EOF'
Show today's video and the four doors of the sanctuary.

EOF
)"
```

---

### Task 10: Confess, Pray, and Talk

**Files:**
- Create: `components/Conversation.tsx`, `app/confess/page.tsx`, `app/pray/page.tsx`, `app/talk/page.tsx`
- Test: `components/Conversation.test.tsx`

**Interfaces:**
- Consumes: `canEnterRoom`, `readMemory`, `writeMemory`, `appendExchange`, `withPortrait`, `foldPortrait`, `FALLBACK`, `POST /api/reply` JSON `{ reply, portrait, source }`
- Produces: `<Conversation mode="confess" | "pray" | "talk" src={string} />`

- [ ] **Step 1: Write the failing test**

Create `components/Conversation.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MEMORY_KEY, type Memory } from "@/lib/memory";
import { Conversation } from "./Conversation";

const ready: Memory = {
  adultConfirmed: true,
  landingComplete: true,
  name: "Anna",
  hope: "peace",
  portrait: "",
  recent: [],
};

describe("Conversation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(MEMORY_KEY, JSON.stringify(ready));
    vi.restoreAllMocks();
  });

  it("sends the message and shows the reply", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ reply: "I hear you, Anna.", portrait: "Anna spoke honestly.", source: "model" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    render(<Conversation mode="confess" src="/videos/confess.mp4" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Your words" }), { target: { value: "I lied" } });
    fireEvent.click(screen.getByRole("button", { name: "Speak" }));
    expect(await screen.findByText("I hear you, Anna.")).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? "{}") as Memory;
    expect(saved.recent).toHaveLength(1);
    expect(saved.portrait).toBe("Anna spoke honestly.");
  });

  it("folds the portrait locally on a fallback reply", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            reply: "I hear you, my child. Lay it down. You are not held by this. Turn toward what is true, and where you have hurt someone, go and make it right.",
            portrait: "",
            source: "fallback",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    render(<Conversation mode="confess" src="/videos/confess.mp4" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Your words" }), { target: { value: "I lied" } });
    fireEvent.click(screen.getByRole("button", { name: "Speak" }));
    expect(await screen.findByText(/Lay it down/)).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? "{}") as Memory;
    expect(saved.portrait).toContain("I lied");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- components/Conversation.test.tsx`

Expected: FAIL with cannot find module `./Conversation`.

- [ ] **Step 3: Write the minimal implementation**

Create `components/Conversation.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FALLBACK, type RoomMode } from "@/lib/persona";
import {
  appendExchange,
  canEnterRoom,
  foldPortrait,
  readMemory,
  withPortrait,
  writeMemory,
} from "@/lib/memory";
import { VideoFrame } from "./VideoFrame";

type ReplyPayload = { reply: string; portrait: string; source: "model" | "fallback" | "crisis" | "limited" };

export function Conversation({ mode, src }: { mode: RoomMode; src: string }) {
  const [allowed, setAllowed] = useState(false);
  const [text, setText] = useState("");
  const [lines, setLines] = useState<Array<{ user: string; jesus: string }>>([]);

  useEffect(() => {
    const memory = readMemory(window.localStorage);
    if (!canEnterRoom(memory)) {
      window.location.assign("/");
      return;
    }
    setAllowed(true);
  }, []);

  async function speak() {
    const message = text.trim();
    if (!message) return;
    setText("");
    const memory = readMemory(window.localStorage);
    let payload: ReplyPayload = { reply: FALLBACK[mode], portrait: memory.portrait, source: "fallback" };
    try {
      const response = await fetch("/api/reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          message,
          name: memory.name,
          hope: memory.hope,
          portrait: memory.portrait,
          recent: memory.recent,
        }),
      });
      payload = (await response.json()) as ReplyPayload;
    } catch {
      payload = { reply: FALLBACK[mode], portrait: memory.portrait, source: "fallback" };
    }
    const portrait =
      payload.source === "model" || payload.source === "crisis"
        ? payload.portrait
        : foldPortrait(memory.portrait, message);
    const next = withPortrait(
      appendExchange(memory, {
        mode,
        at: new Date().toISOString(),
        user: message,
        jesus: payload.reply,
      }),
      portrait,
    );
    writeMemory(window.localStorage, next);
    setLines((current) => [...current, { user: message, jesus: payload.reply }]);
  }

  if (!allowed) return <main className="column" />;

  return (
    <main className="column">
      <VideoFrame src={src} />
      <Link href="/">Return</Link>
      {lines.map((line, index) => (
        <article key={index}>
          <p>{line.user}</p>
          <p className="reply">{line.jesus}</p>
        </article>
      ))}
      <textarea aria-label="Your words" className="field" value={text} onChange={(event) => setText(event.target.value)} />
      <button className="send" type="button" onClick={() => void speak()}>
        Speak
      </button>
    </main>
  );
}
```

Create `app/confess/page.tsx`:

```tsx
"use client";

import { Conversation } from "@/components/Conversation";

export default function ConfessPage() {
  return <Conversation mode="confess" src="/videos/confess.mp4" />;
}
```

Create `app/pray/page.tsx`:

```tsx
"use client";

import { Conversation } from "@/components/Conversation";

export default function PrayPage() {
  return <Conversation mode="pray" src="/videos/pray.mp4" />;
}
```

Create `app/talk/page.tsx`:

```tsx
"use client";

import { Conversation } from "@/components/Conversation";

export default function TalkPage() {
  return <Conversation mode="talk" src="/videos/talk.mp4" />;
}
```

The bridge video plays once per visit because `VideoFrame` mounts once. Later submits only append text.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- components/Conversation.test.tsx`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
cd "/Users/mac/Codinnnnng/AI Jesus"
git add components/Conversation.tsx components/Conversation.test.tsx app/confess/page.tsx app/pray/page.tsx app/talk/page.tsx
git commit -m "$(cat <<'EOF'
Let Confess, Pray, and Talk continue in text after the bridge video.

EOF
)"
```

---

### Task 11: Meet in person

**Files:**
- Create: `lib/meet-media.ts`, `components/Meet.tsx`, `app/meet/page.tsx`
- Test: `lib/meet-media.test.ts`

**Interfaces:**
- Consumes: `canEnterRoom`, `readMemory`, `writeMemory`, `appendExchange`, `POST /api/meet/session`
- Produces:
  - `attachLocalPreview(video: { srcObject: unknown }, stream: unknown, pc: { addTrack: (...args: unknown[]) => unknown }): void`
  - `<Meet />` phases: intro, mirror, live

- [ ] **Step 1: Write the failing test**

Create `lib/meet-media.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { attachLocalPreview } from "./meet-media";

describe("attachLocalPreview", () => {
  it("shows the camera locally and does not send a track", () => {
    const video = { srcObject: null as unknown };
    const stream = { id: "local" };
    const pc = { addTrack: vi.fn() };
    attachLocalPreview(video, stream, pc);
    expect(video.srcObject).toBe(stream);
    expect(pc.addTrack).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test -- lib/meet-media.test.ts`

Expected: FAIL with cannot find module `./meet-media`.

- [ ] **Step 3: Write the minimal implementation**

Create `lib/meet-media.ts`:

```ts
export function attachLocalPreview(
  video: { srcObject: unknown },
  stream: unknown,
  pc: { addTrack: (...args: unknown[]) => unknown },
): void {
  video.srcObject = stream;
  void pc;
}

export function waitForIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(finish, 3000);
    function finish() {
      clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", done);
      resolve();
    }
    function done() {
      if (pc.iceGatheringState === "complete") finish();
    }
    pc.addEventListener("icegatheringstatechange", done);
  });
}

export type MeetCredentials = {
  control_url: string;
  control_token: string;
  session_id: string;
  ice_servers: RTCIceServer[];
};

export function openJesusStream(
  credentials: MeetCredentials,
  video: HTMLVideoElement,
  onText: (turnId: string, text: string) => void,
  onRemainingMs: (ms: number) => void,
  onEnd: () => void,
): { say: (text: string) => void; close: () => void } {
  const pc = new RTCPeerConnection({ iceServers: credentials.ice_servers });
  const ws = new WebSocket(`${credentials.control_url}?session_id=${credentials.session_id}`, [
    "r2.v1",
    `r2.token.${credentials.control_token}`,
  ]);

  function send(type: string, data: Record<string, unknown>) {
    ws.send(JSON.stringify({ type, id: `c-${Date.now()}`, data }));
  }

  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });
  pc.ontrack = (event) => {
    video.srcObject = event.streams[0] ?? null;
    void video.play();
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") send("media.connected", {});
    if (pc.connectionState === "failed") onEnd();
  };

  ws.onopen = () => send("session.start", {});
  ws.onmessage = (raw) => {
    void handle(JSON.parse(String(raw.data)) as { type: string; data?: Record<string, unknown> });
  };
  ws.onerror = () => onEnd();

  async function handle(message: { type: string; data?: Record<string, unknown> }) {
    if (message.type === "session.ready") {
      await pc.setLocalDescription(await pc.createOffer());
      await waitForIce(pc);
      send("media.offer", { sdp: pc.localDescription?.sdp ?? "" });
    }
    if (message.type === "media.answer") {
      await pc.setRemoteDescription({ type: "answer", sdp: String(message.data?.sdp ?? "") });
    }
    if (message.type === "turn.text") onText(String(message.data?.turn_id ?? ""), String(message.data?.text ?? ""));
    if (message.type === "usage.tick" || message.type === "session.renewed") {
      onRemainingMs(Number(message.data?.budget_remaining_ms ?? 0));
    }
    if (message.type === "session.ended" || message.type === "error") onEnd();
  }

  return {
    say(text: string) {
      send("turn.submit", { turn_id: `turn_${crypto.randomUUID()}`, text });
    },
    close() {
      ws.close();
      pc.close();
    },
  };
}
```

`openJesusStream` adds only `recvonly` transceivers. `attachLocalPreview` is the only function allowed to touch the camera element, and it does not call `addTrack`.

Add this rule to `app/globals.css`:

```css
@media (max-width: 799px) {
  .wide-meet { position: relative; }
  .wide-meet .frame:first-child {
    position: absolute;
    right: 12px;
    top: 12px;
    width: 96px;
    aspect-ratio: 3 / 4;
    z-index: 2;
  }
}
```

Create `components/Meet.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { appendExchange, canEnterRoom, readMemory, writeMemory } from "@/lib/memory";
import { attachLocalPreview, openJesusStream, type MeetCredentials } from "@/lib/meet-media";
import { Still } from "./Still";
import { VideoFrame } from "./VideoFrame";

type Phase = "intro" | "mirror" | "live";

export function Meet() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [cameraNote, setCameraNote] = useState("");
  const [liveState, setLiveState] = useState<"idle" | "yes" | "no">("idle");
  const [credentials, setCredentials] = useState<MeetCredentials | null>(null);
  const [lines, setLines] = useState<Array<{ user: string; jesus: string }>>([]);
  const [text, setText] = useState("");
  const [remaining, setRemaining] = useState("3:00");
  const localRef = useRef<HTMLVideoElement>(null);
  const jesusRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<ReturnType<typeof openJesusStream> | null>(null);
  const pendingUser = useRef("");

  useEffect(() => {
    const memory = readMemory(window.localStorage);
    if (!canEnterRoom(memory)) window.location.assign("/");
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!credentials || !jesusRef.current || sessionRef.current) return;
    const video = jesusRef.current;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const left = Math.max(0, 180000 - (Date.now() - started));
      setRemaining(formatMs(left));
      if (left <= 0) leave();
    }, 500);
    sessionRef.current = openJesusStream(
      credentials,
      video,
      (_turnId, jesus) => {
        const user = pendingUser.current;
        setLines((current) => {
          const next = [...current];
          const last = next[next.length - 1];
          if (last && !last.jesus) next[next.length - 1] = { ...last, jesus };
          return next;
        });
        const latest = readMemory(window.localStorage);
        writeMemory(
          window.localStorage,
          appendExchange(latest, { mode: "meet", at: new Date().toISOString(), user, jesus }),
        );
      },
      (ms) => setRemaining(formatMs(ms)),
      () => {
        window.clearInterval(timer);
        leave();
      },
    );
    return () => window.clearInterval(timer);
  }, [credentials]);

  async function openMirror() {
    setPhase("mirror");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (localRef.current) {
        attachLocalPreview(localRef.current, stream, { addTrack: () => undefined });
        await localRef.current.play();
      }
    } catch {
      setCameraNote("You can still sit with me.");
    }
  }

  function leave() {
    sessionRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    window.location.assign("/");
  }

  async function ready() {
    setPhase("live");
    const memory = readMemory(window.localStorage);
    try {
      const response = await fetch("/api/meet/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: memory.name, hope: memory.hope, portrait: memory.portrait }),
      });
      const body = (await response.json()) as { live: boolean; credentials?: MeetCredentials };
      if (!body.live || !body.credentials) {
        setLiveState("no");
        return;
      }
      setLiveState("yes");
      setCredentials(body.credentials);
    } catch {
      setLiveState("no");
    }
  }

  function say() {
    const message = text.trim();
    if (!message || !sessionRef.current) return;
    pendingUser.current = message;
    setText("");
    setLines((current) => [...current, { user: message, jesus: "" }]);
    sessionRef.current.say(message);
  }

  return (
    <main className="column meet-page">
      {phase === "intro" ? (
        <>
          <VideoFrame src="/videos/meet-intro.mp4" />
          <button className="send" type="button" onClick={() => void openMirror()}>
            Continue
          </button>
        </>
      ) : null}
      {phase !== "intro" ? (
        <div className="wide-meet">
          <div className="frame">
            <video ref={localRef} playsInline muted />
            {cameraNote ? <p>{cameraNote}</p> : null}
          </div>
          <div className="frame">
            {phase === "mirror" ? <Still line="When you are ready, sit as you would if I were across from you." /> : null}
            {phase === "live" && liveState === "yes" ? <video ref={jesusRef} playsInline autoPlay /> : null}
            {phase === "live" && liveState === "no" ? <Still line="The live meeting opens when the portrait is connected." /> : null}
          </div>
        </div>
      ) : null}
      {phase === "mirror" ? (
        <button className="send" type="button" onClick={() => void ready()}>
          I am ready
        </button>
      ) : null}
      {phase === "live" && liveState === "yes" ? (
        <>
          <p className="today">{remaining}</p>
          {lines.map((line, index) => (
            <article key={index}>
              <p>{line.user}</p>
              <p className="reply">{line.jesus}</p>
            </article>
          ))}
          <textarea aria-label="Your words" className="field" value={text} onChange={(event) => setText(event.target.value)} />
          <button className="send" type="button" onClick={say}>
            Speak
          </button>
        </>
      ) : null}
    </main>
  );
}

function formatMs(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
```

`ready` stores credentials, then the effect opens the stream after the Jesus video element is on the page. The local camera goes through `attachLocalPreview` only.

Create `app/meet/page.tsx`:

```tsx
"use client";

import { Meet } from "@/components/Meet";

export default function MeetPage() {
  return <Meet />;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test`

Expected: PASS for the whole suite. `attachLocalPreview` does not call `addTrack`.

- [ ] **Step 5: Commit**

```bash
cd "/Users/mac/Codinnnnng/AI Jesus"
git add lib/meet-media.ts lib/meet-media.test.ts components/Meet.tsx app/meet/page.tsx app/globals.css
git commit -m "$(cat <<'EOF'
Add the in-person meeting with a local mirror and a receive-only Jesus stream.

EOF
)"
```

---

### Task 12: Walk the five paths

**Files:**
- Modify: only if a path is broken

**Interfaces:**
- Consumes: the running app at `http://localhost:3000`
- Produces: a checked manual pass, or a fix committed with the test that failed

- [ ] **Step 1: Run the automated suite**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm test`

Expected: PASS.

- [ ] **Step 2: Start the app**

Run: `cd "/Users/mac/Codinnnnng/AI Jesus" && npm run dev`

Expected: Ready on port 3000. No mp4 files are required.

- [ ] **Step 3: Walk the paths**

In the browser:

1. Open `/`. The button reads `I am 18 or older`. The footer reads `An AI portrayal of Jesus. Not a substitute for Scripture, the church, or a pastor.`
2. Confirm, skip the name, continue with an empty hope. The page says `Then come in, my child.` Come in. The sanctuary shows `TODAY`, `Confess`, `Pray`, `Talk`, and `FREE FOR A LIMITED TIME`. The video area is the still line `Peace to you today, my child.`
3. Open `/confess` directly in a fresh profile. It returns home until landing is complete. After landing, Confess shows a text box labeled `Your words`. Submit `I lied`. The reply is the confess fallback, with no `API error` text.
4. Open `/meet`. Continue. Allow or deny the camera. If denied, the page says `You can still sit with me.` Click `I am ready`. Without a Reverie key, Jesus's side says `The live meeting opens when the portrait is connected.`
5. Click `Forget me`. The adult confirmation returns, and `localStorage` no longer has `ai-jesus.memory`.

- [ ] **Step 4: Commit only if this walk changed files**

If nothing changed, do not create an empty commit. If a fix was required, add a regression test first, then:

```bash
cd "/Users/mac/Codinnnnng/AI Jesus"
git add -u
git commit -m "$(cat <<'EOF'
Keep the five-path walk on the still frames when no media or keys are present.

EOF
)"
```
