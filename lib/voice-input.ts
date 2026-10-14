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
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = true;
  let userStop = false;
  let paused = false;
  let skip = 0;
  let seen = 0;
  let latest = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pauseMs = options?.pauseMs ?? PAUSE_MS;

  function heard(event: SpeechEvent): string {
    let text = "";
    for (let i = skip; i < event.results.length; i += 1) text += event.results[i][0].transcript;
    return text.trim();
  }

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
    if (userStop) {
      onEnd();
      return;
    }
    try {
      rec.start();
    } catch {
      onEnd();
    }
  };
  rec.onerror = () => undefined;
  rec.start();

  return {
    stop() {
      userStop = true;
      globalThis.clearTimeout(timer);
      rec.stop();
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
