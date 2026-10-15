export type SpeechEvent = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

export type SpeechLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const PAUSE_MS = 1500;

export function startVoiceInput(
  Ctor: (new () => SpeechLike) | undefined,
  onText: (text: string) => void,
  onEnd: () => void,
  options?: { pauseMs?: number; onPause?: (text: string) => void },
): { stop: () => void; hold: () => void; release: () => void; commit: () => void } | null {
  if (!Ctor) return null;
  const Recognition = Ctor;
  let userStop = false;
  let paused = false;
  let skip = 0;
  let seen = 0;
  let latest = "";
  let epoch = 0;
  let draftEpoch = -1;
  let current: SpeechLike | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  const pauseMs = options?.pauseMs ?? PAUSE_MS;

  function heard(event: SpeechEvent): string {
    let text = "";
    for (let i = skip; i < event.results.length; i += 1) text += event.results[i][0].transcript;
    return text.trim();
  }

  function flush() {
    if (paused || !latest) return;
    const said = latest;
    latest = "";
    draftEpoch = -1;
    skip = seen;
    options?.onPause?.(said);
  }

  function listen() {
    const rec = new Recognition();
    const mine = ++epoch;
    current = rec;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (event) => {
      seen = event.results.length;
      if (paused || (draftEpoch >= 0 && mine !== draftEpoch)) {
        skip = seen;
        return;
      }
      const text = heard(event);
      if (!text) return;
      latest = text;
      draftEpoch = mine;
      onText(latest);
      if (!options?.onPause) return;
      globalThis.clearTimeout(timer);
      timer = globalThis.setTimeout(flush, pauseMs);
    };
    rec.onend = () => {
      if (current !== rec) return;
      if (userStop) {
        onEnd();
        return;
      }
      skip = 0;
      seen = 0;
      globalThis.clearTimeout(restartTimer);
      restartTimer = globalThis.setTimeout(() => {
        if (userStop) return;
        try {
          listen();
        } catch {
          onEnd();
        }
      }, 250);
    };
    rec.onerror = () => undefined;
    rec.start();
  }

  listen();

  return {
    stop() {
      userStop = true;
      globalThis.clearTimeout(timer);
      globalThis.clearTimeout(restartTimer);
      try {
        current?.stop();
      } catch {
        onEnd();
      }
    },
    hold() {
      paused = true;
      skip = seen;
    },
    release() {
      paused = false;
      if (!latest || !options?.onPause) return;
      globalThis.clearTimeout(timer);
      timer = globalThis.setTimeout(flush, pauseMs);
    },
    commit() {
      skip = seen;
      latest = "";
      draftEpoch = -1;
      globalThis.clearTimeout(timer);
    },
  };
}
