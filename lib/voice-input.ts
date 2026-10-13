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

export function startVoiceInput(
  Ctor: (new () => SpeechLike) | undefined,
  onText: (text: string) => void,
  onEnd: () => void,
): { stop: () => void } | null {
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = true;
  rec.onresult = (event) => {
    let text = "";
    for (let i = 0; i < event.results.length; i += 1) text += event.results[i][0].transcript;
    onText(text.trim());
  };
  rec.onend = onEnd;
  rec.onerror = onEnd;
  rec.start();
  return {
    stop() {
      rec.stop();
    },
  };
}
