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
