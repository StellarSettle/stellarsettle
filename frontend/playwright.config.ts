import { defineConfig, devices } from "@playwright/test";

export const E2E_CONTRACT_ID = "CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526";
export const E2E_RPC_URL = "http://rpc.e2e.test";
export const E2E_BACKEND_URL = "http://backend.e2e.test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4173", headless: true, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx vite build --mode e2e && npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_E2E: "true",
      VITE_LOCALE: "en",
      VITE_STELLAR_NETWORK: "testnet",
      VITE_STELLAR_RPC_URL: E2E_RPC_URL,
      VITE_STELLAR_CONTRACT_ID: E2E_CONTRACT_ID,
      VITE_BACKEND_URL: E2E_BACKEND_URL,
    },
  },
});
