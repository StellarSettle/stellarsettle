import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Shipment } from "./lib/stellar";

const stellar = vi.hoisted(() => ({
  connectWallet: vi.fn(),
  getShipmentSummary: vi.fn(),
  setShipmentMetadata: vi.fn(),
}));

vi.mock("./lib/stellar", () => ({
  appNetwork: "testnet",
  configuredContractId: "CTEST",
  ...stellar,
}));

import App from "./App";

const address = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW";

function makeShipment(id: string): Shipment {
  return {
    id,
    status: "Active",
    supplier: address,
    token: address,
    total_amount: "1000",
    released_amount: "250",
    milestone_count: 3,
    open_disputes: 0,
    created_at: 42,
  };
}

function mockFetch(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const match = Object.keys(routes).find((route) => url.includes(route));
    return new Response(JSON.stringify(match ? routes[match] : {}), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function connect(user: ReturnType<typeof userEvent.setup>) {
  stellar.connectWallet.mockResolvedValue({ address, network: "TESTNET", networkPassphrase: "Test" });
  await user.click(screen.getByRole("button", { name: /connect wallet/i }));
  await waitFor(() => expect(screen.getAllByText("Wallet connected")).toHaveLength(2));
}

describe("App", () => {
  beforeEach(() => {
    mockFetch({ "/api/health": { status: "ok" }, "/api/events": [], "/api/shipments/search": [] });
  });

  it("connects the wallet and shows a success notice", async () => {
    const user = userEvent.setup();
    render(<App />);
    await connect(user);
    expect(stellar.connectWallet).toHaveBeenCalledOnce();
    expect(screen.getAllByText("GABCD...STUVW").length).toBeGreaterThan(0);
  });

  it("shows an error when wallet connection fails and lets the user dismiss it", async () => {
    const user = userEvent.setup();
    stellar.connectWallet.mockRejectedValue(new Error("Freighter is locked"));
    render(<App />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    expect(await screen.findByText("Freighter is locked")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Freighter is locked")).not.toBeInTheDocument();
  });

  it("looks up a shipment by ID, showing a skeleton while loading", async () => {
    const user = userEvent.setup();
    let resolve!: (shipment: Shipment) => void;
    stellar.getShipmentSummary.mockReturnValue(new Promise<Shipment>((done) => { resolve = done; }));
    render(<App />);
    await connect(user);
    await user.type(screen.getByLabelText("Shipment ID"), "SHIP-001");
    await user.click(screen.getByRole("button", { name: /look up/i }));
    expect(screen.getByTestId("shipment-skeleton")).toBeInTheDocument();
    expect(screen.getAllByTestId("metric-skeleton")).toHaveLength(3);
    await act(async () => resolve(makeShipment("SHIP-001")));
    expect(stellar.getShipmentSummary).toHaveBeenCalledWith(address, "SHIP-001");
    expect(screen.queryByTestId("shipment-skeleton")).not.toBeInTheDocument();
    expect(screen.getAllByText("SHIP-001").length).toBeGreaterThan(0);
  });

  it("shows the lookup error when the contract query fails", async () => {
    const user = userEvent.setup();
    stellar.getShipmentSummary.mockRejectedValue(new Error("Shipment not found"));
    render(<App />);
    await connect(user);
    await user.type(screen.getByLabelText("Shipment ID"), "MISSING");
    await user.click(screen.getByRole("button", { name: /look up/i }));
    expect(await screen.findByText("Shipment not found")).toBeInTheDocument();
  });

  it("debounces global search and loads the selected shipment", async () => {
    const fetchMock = mockFetch({
      "/api/health": { status: "ok" },
      "/api/events": [],
      "/api/shipments/search": [{ shipmentId: "SHIP-042", buyer: address, supplier: null, lastLedger: 10 }],
    });
    stellar.getShipmentSummary.mockResolvedValue(makeShipment("SHIP-042"));
    const user = userEvent.setup();
    render(<App />);
    await connect(user);
    await user.type(screen.getByLabelText("Search shipments"), "SHIP-04");
    const results = await screen.findByRole("listbox", { name: "Shipment search results" });
    const searchCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/shipments/search"));
    expect(searchCalls).toHaveLength(1);
    expect(String(searchCalls[0][0])).toContain("q=SHIP-04");
    await user.click(within(results).getByRole("button", { name: /SHIP-042/ }));
    await waitFor(() => expect(stellar.getShipmentSummary).toHaveBeenCalledWith(address, "SHIP-042"));
  });

  it("shows a clear empty state when search finds nothing", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Search shipments"), "nope");
    expect(await screen.findByText(/No shipments match/)).toBeInTheDocument();
  });

  it("paginates dispute events with keyboard-accessible controls", async () => {
    const events = Array.from({ length: 6 }, (_, index) => ({
      id: `evt-${index}`, ledger: 100 - index, type: "dispute_escalated", shipmentId: `S-${index}`, milestoneIndex: 0, openedLedger: 1, currentLedger: 2,
    }));
    mockFetch({ "/api/health": { status: "ok" }, "/api/events": events });
    render(<App />);
    const nav = await screen.findByRole("navigation", { name: "Dispute activity pagination" });
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText(/S-0 ·/)).toBeInTheDocument();
    expect(screen.queryByText(/S-5 ·/)).not.toBeInTheDocument();
    const next = within(nav).getByRole("button", { name: "Next page" });
    next.focus();
    fireEvent.click(next);
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByText(/S-5 ·/)).toBeInTheDocument();
    expect(next).toBeDisabled();
  });
});
