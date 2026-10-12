/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sanctuary } from "./Sanctuary";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

describe("Sanctuary", () => {
  it("offers the three rooms and the meeting", () => {
    render(<Sanctuary choice={{ kind: "still", line: "Peace to you today, my child." }} />);
    expect(screen.getByRole("link", { name: "Confess" }).getAttribute("href")).toBe("/confess");
    expect(screen.getByRole("link", { name: "Pray" }).getAttribute("href")).toBe("/pray");
    expect(screen.getByRole("link", { name: "Talk" }).getAttribute("href")).toBe("/talk");
    expect(screen.getByRole("link", { name: /Meet in person/ }).getAttribute("href")).toBe("/meet");
    expect(screen.getByText("FREE FOR A LIMITED TIME")).toBeTruthy();
    expect(screen.getByText("TODAY")).toBeTruthy();
    expect(screen.getByText("Peace to you today, my child.")).toBeTruthy();
  });
});
