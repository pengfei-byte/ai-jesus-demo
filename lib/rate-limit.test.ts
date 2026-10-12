import { describe, expect, it, beforeEach } from "vitest";
import { allow, clientIp, resetLimits } from "./rate-limit";

describe("rate limit", () => {
  beforeEach(() => resetLimits());

  it("allows up to the limit inside the window", () => {
    expect(allow("a", 2, 1000, 0)).toBe(true);
    expect(allow("a", 2, 1000, 10)).toBe(true);
    expect(allow("a", 2, 1000, 20)).toBe(false);
  });

  it("opens a new window after the interval", () => {
    expect(allow("a", 1, 1000, 0)).toBe(true);
    expect(allow("a", 1, 1000, 1000)).toBe(true);
  });

  it("reads the first forwarded address", () => {
    const request = new Request("http://localhost/api/reply", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(clientIp(request)).toBe("203.0.113.5");
    expect(clientIp(new Request("http://localhost/api/reply"))).toBe("local");
  });
});
