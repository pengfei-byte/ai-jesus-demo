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
  let current: SpeechLike | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pauseMs = options?.pauseMs ?? PAUSE_MS;

  function heard(event: SpeechEvent): string {
    let text = "";
    for (let i = skip; i < event.results.length; i += 1) text += event.results[i][0].transcript;
    return text.trim();
  }

  function listen() {
    const rec = new Recognition();
    current = rec;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (event) => {
      seen = event.results.length;
      if (paused) {
        skip = seen;
        return;
      }
      latest = heard(event);
      onText(latest);
      if (!options?.onPause || !latest) return;
      globalThis.clearTimeout(timer);
      timer = globalThis.setTimeout(() => {
        const said = latest;
        latest = "";
        skip = seen;
        if (said && !paused) options.onPause?.(said);
      }, pauseMs);
    };
    rec.onend = () => {
      if (current !== rec) return;
      if (userStop) {
        onEnd();
        return;
      }
      skip = 0;
      seen = 0;
      try {
        listen();
      } catch {
        onEnd();
      }
    };
    rec.onerror = () => undefined;
    rec.start();
  }

  listen();

  return {
    stop() {
      userStop = true;
      globalThis.clearTimeout(timer);
      try {
        current?.stop();
      } catch {
        onEnd();
      }
    },
    hold() {
      paused = true;
      skip = seen;
      latest = "";
      globalThis.clearTimeout(timer);
      onText("");
    },
    release() {
      paused = false;
    },
    commit() {
      skip = seen;
      latest = "";
      globalThis.clearTimeout(timer);
    },
  };
}
