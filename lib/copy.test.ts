import { describe, expect, it } from "vitest";
import { inviteLine } from "./copy";

describe("inviteLine", () => {
  it("uses the name when one was given", () => {
    expect(inviteLine(" Anna ")).toBe("Then come in, Anna.");
  });

  it("uses my child when the name was skipped", () => {
    expect(inviteLine("  ")).toBe("Then come in, my child.");
  });
});
