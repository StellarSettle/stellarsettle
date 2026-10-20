// @ts-nocheck -- vitest/testing-library are added to package.json by the frontend test-setup PR
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OraclePrice } from "./OraclePrice";

describe("OraclePrice", () => {
  it("renders loading", () => {
    render(<OraclePrice price={null} lastUpdateLedger={null} currentLedger={null} loading />);
    expect(screen.getByText(/loading oracle price/i)).toBeTruthy();
  });
  it("renders error", () => {
    render(<OraclePrice price={null} lastUpdateLedger={null} currentLedger={null} error="down" />);
    expect(screen.getByRole("alert").textContent).toContain("down");
  });
  it("renders empty", () => {
    render(<OraclePrice price={null} lastUpdateLedger={null} currentLedger={null} />);
    expect(screen.getByText(/no oracle price/i)).toBeTruthy();
  });
  it("renders fresh price without warning", () => {
    render(<OraclePrice price={5} lastUpdateLedger={100} currentLedger={110} />);
    expect(screen.getByText(/10 ledgers ago/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("shows stale banner", () => {
    render(<OraclePrice price={5} lastUpdateLedger={100} currentLedger={1000} />);
    expect(screen.getByRole("alert").textContent).toContain("stale");
  });
});
