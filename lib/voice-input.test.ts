import { afterEach, describe, expect, it, vi } from "vitest";
import { startVoiceInput, type SpeechEvent, type SpeechLike } from "./voice-input";

describe("startVoiceInput", () => {
  it("puts the spoken words into the field and can stop", () => {
    const heard: string[] = [];
    let ended = false;
    const rec: SpeechLike = {
      lang: "",
      interimResults: false,
      continuous: false,
      onresult: null,
      onend: null,
      onerror: null,
      start() {
        this.onresult?.({ results: [{ 0: { transcript: "I am tired" } }] });
      },
      stop() {
        this.onend?.();
      },
    };
    const session = startVoiceInput(
      function Ctor(this: SpeechLike) {
        return rec;
      } as unknown as new () => SpeechLike,
      (text) => heard.push(text),
      () => {
        ended = true;
      },
    );
    expect(heard).toEqual(["I am tired"]);
    expect(rec.lang).toBe("en-US");
    session?.stop();
    expect(ended).toBe(true);
  });

  it("does nothing when the browser has no speech recognition", () => {
    expect(startVoiceInput(undefined, () => undefined, () => undefined)).toBeNull();
  });

  it("sends after a pause and ignores words heard while Jesus is speaking", () => {
    vi.useFakeTimers();
    const heard: string[] = [];
    const sent: string[] = [];
    const rec = fakeRecognizer();
    const session = startVoiceInput(asCtor(rec), (text) => heard.push(text), () => undefined, {
      pauseMs: 1500,
      onPause: (text) => sent.push(text),
    });
    emit(rec, ["hello there"]);
    vi.advanceTimersByTime(1499);
    expect(sent).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(sent).toEqual(["hello there"]);

    session?.hold();
    emit(rec, ["hello there", " peace to you"]);
    expect(heard.at(-1)).toBe("hello there");
    expect(sent).toEqual(["hello there"]);

    session?.release();
    emit(rec, ["hello there", " peace to you", " I am tired"]);
    expect(heard.at(-1)).toBe("I am tired");
    vi.useRealTimers();
  });

  it("keeps a finished sentence when the next recognition emits a fragment", () => {
    vi.useFakeTimers();
    const heard: string[] = [];
    const sent: string[] = [];
    const rec = fakeRecognizer();
    startVoiceInput(asCtor(rec), (text) => heard.push(text), () => undefined, {
      pauseMs: 1500,
      onPause: (text) => sent.push(text),
    });
    emit(rec, ["second sentence"]);
    rec.onend?.();
    vi.advanceTimersByTime(250);
    emit(rec, ["uh"]);
    expect(heard.at(-1)).toBe("second sentence");
    vi.advanceTimersByTime(1500);
    expect(sent).toEqual(["second sentence"]);
    vi.useRealTimers();
  });

  it("hears the next sentence after the browser starts a fresh recognition", () => {
    const heard: string[] = [];
    const rec = fakeRecognizer();
    startVoiceInput(asCtor(rec), (text) => heard.push(text), () => undefined);
    emit(rec, ["hello there"]);
    rec.onend?.();
    emit(rec, ["peace to you"]);
    expect(heard.at(-1)).toBe("peace to you");
  });
});

function emit(rec: SpeechLike, transcripts: string[]) {
  const results = transcripts.map((transcript) => ({ 0: { transcript } }));
  rec.onresult?.({ results } as SpeechEvent);
}

function fakeRecognizer(): SpeechLike {
  return {
    lang: "",
    interimResults: false,
    continuous: false,
    onresult: null,
    onend: null,
    onerror: null,
    start() {},
    stop() {
      this.onend?.();
    },
  };
}

function asCtor(rec: SpeechLike): new () => SpeechLike {
  return function Ctor(this: SpeechLike) {
    return rec;
  } as unknown as new () => SpeechLike;
}

afterEach(() => {
  vi.useRealTimers();
});
