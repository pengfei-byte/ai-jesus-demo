import { describe, expect, it } from "vitest";
import { STILL_LINE, selectDaily } from "./videos";

describe("selectDaily", () => {
  it("uses the weekday file when it exists", () => {
    const choice = selectDaily(1, (name) => name === "daily-1.mp4");
    expect(choice).toEqual({ kind: "file", src: "/videos/daily-1.mp4" });
  });

  it("falls back to daily.mp4", () => {
    const choice = selectDaily(3, (name) => name === "daily.mp4");
    expect(choice).toEqual({ kind: "file", src: "/videos/daily.mp4" });
  });

  it("uses the still line when no file exists", () => {
    expect(selectDaily(0, () => false)).toEqual({ kind: "still", line: STILL_LINE });
    expect(STILL_LINE).toBe("Peace to you today, my child.");
  });
});
