export const STILL_LINE = "Peace to you today, my child.";

export type VideoChoice = { kind: "file"; src: string } | { kind: "still"; line: string };

export function selectDaily(weekday: number, exists: (name: string) => boolean): VideoChoice {
  const named = `daily-${weekday}.mp4`;
  if (exists(named)) return { kind: "file", src: `/videos/${named}` };
  if (exists("daily.mp4")) return { kind: "file", src: "/videos/daily.mp4" };
  return { kind: "still", line: STILL_LINE };
}
