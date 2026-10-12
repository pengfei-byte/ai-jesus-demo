import { describe, expect, it, vi } from "vitest";
import { attachLocalPreview } from "./meet-media";

describe("attachLocalPreview", () => {
  it("shows the camera locally and does not send a track", () => {
    const video = { srcObject: null as unknown };
    const stream = { id: "local" };
    const pc = { addTrack: vi.fn() };
    attachLocalPreview(video, stream, pc);
    expect(video.srcObject).toBe(stream);
    expect(pc.addTrack).not.toHaveBeenCalled();
  });
});
