import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { clearWalletSession, saveWalletSession } from "../../lib/walletSession";

function WalletMenu({ connected, onDisconnect }: { connected: boolean; onDisconnect: () => void }) {
  if (!connected) return <div>Connect</div>;
  return (
    <div>
      <span>Wallet connected</span>
      <button type="button" onClick={onDisconnect}>
        Disconnect wallet
      </button>
    </div>
  );
}

describe("wallet disconnect flow", () => {
  it("clears sessionStorage and returns to disconnected state", () => {
    saveWalletSession("GTEST");
    const onDisconnect = vi.fn(() => {
      clearWalletSession();
    });

    const { rerender } = render(<WalletMenu connected onDisconnect={onDisconnect} />);
    fireEvent.click(screen.getByRole("button", { name: /disconnect wallet/i }));
    expect(onDisconnect).toHaveBeenCalled();
    expect(sessionStorage.getItem("stellarsettle:walletAddress")).toBeNull();

    rerender(<WalletMenu connected={false} onDisconnect={onDisconnect} />);
    expect(screen.getByText("Connect")).toBeTruthy();
  });
});