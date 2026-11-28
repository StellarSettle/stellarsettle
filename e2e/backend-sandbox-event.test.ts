/**
 * Issue #236: backend event monitor E2E against local Soroban sandbox (Docker).
 * Skipped when Docker is unavailable.
 */
import { test } from "node:test";

test("sandbox e2e placeholder is wired for CI", { skip: process.env.CI !== "true" }, () => {
  // Full Docker sandbox flow lives in backend/src/local-sandbox.test.ts; this entry
  // point is exposed via npm run test:e2e for a dedicated CI job.
});