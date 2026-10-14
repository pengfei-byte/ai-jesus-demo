/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MEMORY_KEY } from "@/lib/memory";
import HomePage from "@/app/page";

describe("home", () => {
  beforeEach(() => window.localStorage.clear());

  it("asks what to call them after they turn on the sound", () => {
    render(<HomePage />);
    expect(screen.queryByRole("button", { name: "I am 18 or older" })).toBeNull();
    expect(screen.getByRole("button", { name: /Tap to turn on the sound/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Tap to turn on the sound/ }));
    expect(screen.getByText("What should I call you?")).toBeTruthy();
  });

  it("writes both answers together and shows the invitation", () => {
    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: /Tap to turn on the sound/ }));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Then come in, my child.")).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? "{}");
    expect(saved.landingComplete).toBe(true);
    expect(saved.name).toBe("");
  });
});
