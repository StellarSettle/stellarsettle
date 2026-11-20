import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShipmentCard } from "../ShipmentCard";

const shipment = {
  id: "SHIP-TEST",
  status: "Active",
  supplier: "GABC",
  token: "GDEF",
  total_amount: "1000",
  released_amount: "250",
  milestone_count: 4,
  open_disputes: 0,
  created_at: 100,
};

describe("ShipmentCard", () => {
  it("renders shipment ID and status", () => {
    render(<ShipmentCard shipment={shipment} progressPercent={25} />);
    expect(screen.getByText("SHIP-TEST")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("shows correct milestone progress bar", () => {
    render(<ShipmentCard shipment={shipment} progressPercent={75} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("75");
  });

  it("dispatches callback when user clicks Confirm milestone", async () => {
    const onConfirm = vi.fn();
    render(<ShipmentCard shipment={shipment} progressPercent={10} onConfirmMilestone={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: /confirm milestone/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});