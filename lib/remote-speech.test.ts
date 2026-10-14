import { describe, expect, it } from "vitest";
import { isLoud, speechHoldMs } from "./remote-speech";

describe("remote speech", () => {
  it("treats silence as quiet and a strong signal as speech", () => {
    expect(isLoud([128, 128, 128, 128])).toBe(false);
    expect(isLoud([40, 200, 40, 200])).toBe(true);
  });

  it("holds the microphone longer for a longer reply", () => {
    expect(speechHoldMs("Peace.")).toBeLessThan(speechHoldMs("Peace to you. I am glad you came to sit with me today."));
    expect(speechHoldMs("word ".repeat(80))).toBe(20000);
  });
});