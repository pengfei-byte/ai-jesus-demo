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
