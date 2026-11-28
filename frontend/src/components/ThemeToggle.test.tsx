import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-theme");
  });

  it("uses the system preference on first visit and persists a user toggle", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { unmount } = render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: "Switch to light theme" });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("stellarsettle-theme")).toBeNull();

    fireEvent.click(toggle);

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("stellarsettle-theme")).toBe("light");

    unmount();
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Switch to dark theme" }).getAttribute("aria-pressed")).toBe("false");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("prefers a saved theme over the system setting", () => {
    localStorage.setItem("stellarsettle-theme", "dark");
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));

    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "Switch to light theme" }).getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
