import { test, expect } from '@playwright/test';

// Mock the Freighter extension API before the app boots so the wallet
// connection flow can be exercised without the real browser extension.
const FREIGHTER_MOCK = `
  (() => {
    const PUBLIC_KEY = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
    const api = {
      isConnected: async () => ({ isConnected: true }),
      isAllowed: async () => ({ isAllowed: true }),
      requestAccess: async () => ({ address: PUBLIC_KEY }),
      getAddress: async () => ({ address: PUBLIC_KEY }),
      getPublicKey: async () => PUBLIC_KEY,
      signTransaction: async (xdr) => ({ signedTxXdr: xdr, signerAddress: PUBLIC_KEY }),
    };
    window.freighter = api;
    window.freighterApi = api;
  })();
`;

test.describe('Freighter wallet flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(FREIGHTER_MOCK);
  });

  test('connects wallet and views shipments', async ({ page }) => {
    await page.goto('/');

    // Dashboard renders.
    await expect(page.locator('body')).toBeVisible();

    // Connect wallet.
    const connectButton = page.getByRole('button', { name: /connect/i }).first();
    await expect(connectButton).toBeVisible();
    await connectButton.click();

    // Wallet address should surface after connecting.
    await expect(page.getByText(/GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5/i)).toBeVisible();

    // Navigate to shipments and confirm the view renders.
    const shipmentsLink = page.getByRole('link', { name: /shipments/i }).first();
    if (await shipmentsLink.count()) {
      await shipmentsLink.click();
    } else {
      await page.getByRole('button', { name: /shipments/i }).first().click();
    }

    await expect(page.getByRole('heading', { name: /shipments/i }).first()).toBeVisible();
  });
});
