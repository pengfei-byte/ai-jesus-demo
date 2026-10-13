import { describe, expect, it } from "vitest";
import { startVoiceInput, type SpeechLike } from "./voice-input";

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
});
