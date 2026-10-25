import { expect, test, type Page } from "@playwright/test";
import { SorobanDataBuilder, nativeToScVal, Networks } from "@stellar/stellar-sdk";
import { E2E_BACKEND_URL, E2E_RPC_URL } from "../playwright.config";

const WALLET = "GABAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEJXA";

const shipmentRetval = nativeToScVal({
  created_at: nativeToScVal(12345, { type: "u64" }),
  id: "SHIP-001",
  milestone_count: nativeToScVal(3, { type: "u32" }),
  open_disputes: nativeToScVal(1, { type: "u32" }),
  released_amount: "2500",
  status: "Active",
  supplier: nativeToScVal(WALLET, { type: "address" }),
  token: nativeToScVal(WALLET, { type: "address" }),
  total_amount: "10000",
}).toXDR("base64");

async function mockBackend(page: Page) {
  await page.route(`${E2E_BACKEND_URL}/api/health`, (route) => route.fulfill({ json: { ok: true } }));
  await page.route(`${E2E_BACKEND_URL}/api/events**`, (route) => route.fulfill({ json: [] }));
  await page.route(`${E2E_BACKEND_URL}/api/stream`, (route) =>
    route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: "" }),
  );
}

async function mockRpc(page: Page, result: Record<string, unknown>) {
  await page.route(`${E2E_RPC_URL}/**`, async (route) => {
    const request = route.request().postDataJSON() as { id: number; method: string };
    if (request.method !== "simulateTransaction") {
      return route.fulfill({ json: { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "unmocked" } } });
    }
    return route.fulfill({ json: { jsonrpc: "2.0", id: request.id, result } });
  });
}

async function connect(page: Page) {
  await page.addInitScript(([address, passphrase]) => {
    (window as unknown as { __STELLARSETTLE_E2E_WALLET__: unknown }).__STELLARSETTLE_E2E_WALLET__ = {
      address,
      network: "TESTNET",
      networkPassphrase: passphrase,
    };
  }, [WALLET, Networks.TESTNET]);
  await page.goto("/");
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await expect(page.getByText("Wallet connected").first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockBackend(page);
});

test("renders a shipment returned by the contract", async ({ page }) => {
  await mockRpc(page, {
    latestLedger: 100,
    minResourceFee: "100",
    transactionData: new SorobanDataBuilder().build().toXDR("base64"),
    results: [{ auth: [], xdr: shipmentRetval }],
  });
  await connect(page);

  await page.getByLabel("Shipment ID").fill("SHIP-001");
  await page.getByRole("button", { name: "Look up" }).click();

  const detail = page.getByTestId("shipment-detail");
  await expect(detail).toBeVisible();
  await expect(detail.getByText("SHIP-001")).toBeVisible();
  await expect(detail.getByText("Active")).toBeVisible();
  await expect(detail.getByText("10,000")).toBeVisible();
  await expect(detail.getByText("2,500")).toBeVisible();
  await expect(page.getByText("API connected")).toBeVisible();
});

test("shows an error when the shipment is not found", async ({ page }) => {
  await mockRpc(page, {
    latestLedger: 100,
    error: "HostError: Error(Contract, #4) shipment not found",
  });
  await connect(page);

  await page.getByLabel("Shipment ID").fill("MISSING");
  await page.getByRole("button", { name: "Look up" }).click();

  await expect(page.getByRole("status")).toContainText("shipment not found");
  await expect(page.getByTestId("shipment-detail")).toHaveCount(0);
  await expect(page.getByText("Shipment details appear here")).toBeVisible();
});
