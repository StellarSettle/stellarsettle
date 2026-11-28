import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DisputeModal } from "./DisputeModal";
import * as stellar from "../lib/stellar";
import { BUYER, walletFor } from "../test/fixtures";

describe("DisputeModal", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const wallet = walletFor(BUYER);

  it("does not render when isOpen is false", () => {
    render(
      <DisputeModal
        isOpen={false}
        onClose={vi.fn()}
        wallet={wallet}
        shipmentId="SHIP-1"
        milestoneIndex={0}
        milestoneName="Manufacturing completed"
      />
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders correctly when isOpen is true with milestone details", () => {
    render(
      <DisputeModal
        isOpen={true}
        onClose={vi.fn()}
        wallet={wallet}
        shipmentId="SHIP-1"
        milestoneIndex={1}
        milestoneName="Customs Clearance"
      />
    );

    expect(screen.getByRole("dialog", { name: /open dispute modal/i })).toBeTruthy();
    expect(screen.getByText("Milestone 2: Customs Clearance")).toBeTruthy();
    expect(screen.getByLabelText("Evidence description")).toBeTruthy();
    expect(screen.getByRole("button", { name: /submit dispute transaction/i })).toBeTruthy();
  });

  it("hashes description via WebCrypto SHA-256 and submits transaction via Freighter", async () => {
    const spy = vi
      .spyOn(stellar, "openDisputeWithEvidence")
      .mockResolvedValue({ txHash: "tx_mock_12345", evidenceHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" });

    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const onNotice = vi.fn();

    render(
      <DisputeModal
        isOpen={true}
        onClose={onClose}
        wallet={wallet}
        shipmentId="SHIP-1"
        milestoneIndex={0}
        milestoneName="Goods Dispatched"
        onSuccess={onSuccess}
        onNotice={onNotice}
      />
    );

    const textarea = screen.getByLabelText("Evidence description");
    fireEvent.change(textarea, { target: { value: "Goods arrived defective and missing serial numbers." } });

    const submitBtn = screen.getByRole("button", { name: /submit dispute transaction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        wallet,
        "SHIP-1",
        0,
        "Goods arrived defective and missing serial numbers."
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        "tx_mock_12345",
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      );
      expect(onNotice).toHaveBeenCalledWith(expect.stringContaining("Dispute raised on milestone 1"));
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("displays error toast and keeps modal open when transaction fails", async () => {
    vi.spyOn(stellar, "openDisputeWithEvidence").mockRejectedValue(new Error("Transaction rejected by user in Freighter"));

    const onClose = vi.fn();
    const onError = vi.fn();

    render(
      <DisputeModal
        isOpen={true}
        onClose={onClose}
        wallet={wallet}
        shipmentId="SHIP-1"
        milestoneIndex={0}
        milestoneName="Goods Dispatched"
        onError={onError}
      />
    );

    const textarea = screen.getByLabelText("Evidence description");
    fireEvent.change(textarea, { target: { value: "Wrong shipping documents provided." } });

    const submitBtn = screen.getByRole("button", { name: /submit dispute transaction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Transaction rejected by user in Freighter");
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it("closes modal on cancel click or close button click", () => {
    const onClose = vi.fn();
    render(
      <DisputeModal
        isOpen={true}
        onClose={onClose}
        wallet={wallet}
        shipmentId="SHIP-1"
        milestoneIndex={0}
        milestoneName="Goods Dispatched"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
