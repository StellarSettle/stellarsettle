// @ts-nocheck -- vitest/testing-library are added to package.json by the frontend test-setup PR
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoanHealth } from "./LoanHealth";

describe("LoanHealth", () => {
  it("renders loading", () => {
    render(<LoanHealth collateral={1} price={1} debt={1} loading />);
    expect(screen.getByText(/loading loan health/i)).toBeTruthy();
  });
  it("renders error", () => {
    render(<LoanHealth collateral={1} price={1} debt={1} error="boom" />);
    expect(screen.getByRole("alert").textContent).toContain("boom");
  });
  it("renders healthy state with text alternative", () => {
    render(<LoanHealth collateral={10} price={2} debt={5} />);
    expect(screen.getByText(/Health factor: 4.00 \(Healthy\)/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("warns below safety margin", () => {
    render(<LoanHealth collateral={10} price={1} debt={8} />);
    expect(screen.getByRole("alert").textContent).toContain("safety margin");
  });
  it("shows no debt state", () => {
    render(<LoanHealth collateral={10} price={1} debt={0} />);
    expect(screen.getByText(/No debt/)).toBeTruthy();
  });
});
