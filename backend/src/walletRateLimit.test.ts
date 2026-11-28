import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import Fastify from "fastify";
import { registerWalletMutationRateLimit } from "./walletRateLimit.ts";

test("wallet-keyed mutation rate limit returns 429 with Retry-After", async () => {
  const app = Fastify({ logger: false });
  await registerWalletMutationRateLimit(app, { max: 2, timeWindow: 300 });
  app.post("/v1/api/metadata", async () => ({}));
  await app.ready();
  try {
    const headers = { "x-stellar-address": "GADDR1" };
    assert.equal((await app.inject({ method: "POST", url: "/v1/api/metadata", headers })).statusCode, 200);
    assert.equal((await app.inject({ method: "POST", url: "/v1/api/metadata", headers })).statusCode, 200);
    const blocked = await app.inject({ method: "POST", url: "/v1/api/metadata", headers });
    assert.equal(blocked.statusCode, 429);
    assert.ok(blocked.headers["retry-after"]);
    await delay(350);
    assert.equal((await app.inject({ method: "POST", url: "/v1/api/metadata", headers })).statusCode, 200);
  } finally {
    await app.close();
  }
});