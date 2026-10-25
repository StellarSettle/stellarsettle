// @ts-nocheck -- vitest/testing-library are added to package.json by the frontend test-setup PR
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LiquidationHistory } from "./LiquidationHistory";

const events = Array.from({ length: 12 }, (_, i) => ({ id: String(i), liquidated: "G" + i, amountSeized: "10", ledger: i }));

describe("LiquidationHistory", () => {
  it("renders loading", () => {
    render(<LiquidationHistory events={[]} loading />);
    expect(screen.getByText(/loading liquidation/i)).toBeTruthy();
  });
  it("renders error", () => {
    render(<LiquidationHistory events={[]} error="nope" />);
    expect(screen.getByRole("alert").textContent).toContain("nope");
  });
  it("renders empty state", () => {
    render(<LiquidationHistory events={[]} />);
    expect(screen.getByText(/no liquidations/i)).toBeTruthy();
  });
  it("renders rows and paginates", () => {
    render(<LiquidationHistory events={events} />);
    expect(screen.getByText("G0")).toBeTruthy();
    expect(screen.queryByText("G11")).toBeNull();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("G11")).toBeTruthy();
  });
});
