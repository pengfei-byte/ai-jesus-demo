import { describe, expect, it } from "vitest";
import { OPENING_COUNT, greetingRequest, openingFor } from "./openings";

describe("openingFor", () => {
  it("has ten greetings and each one says the person's name", () => {
    const lines = Array.from({ length: OPENING_COUNT }, (_, index) => openingFor("Mara", index));
    expect(lines).toHaveLength(10);
    expect(new Set(lines).size).toBe(10);
    for (const line of lines) expect(line).toContain("Mara");
  });

  it("uses my child when no name was given", () => {
    expect(openingFor("  ", 0)).toContain("my child");
  });

  it("asks Jesus to say the greeting and nothing else", () => {
    const line = openingFor("Mara", 3);
    expect(greetingRequest(line)).toContain(line);
    expect(greetingRequest(line)).toContain("nothing more");
  });
});
