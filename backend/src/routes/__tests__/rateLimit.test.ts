import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";

const MAX = 3;
const WINDOW_MS = 300;

/**
 * Builds a Fastify app with the rate-limit plugin registered for testing.
 *
 * Registers `@fastify/rate-limit` with `max: MAX` requests per `WINDOW_MS`
 * window, keyed by the `x-wallet-address` header (falling back to the
 * request IP). A stub `GET /v1/api/events` route is registered that returns
 * an empty array on success.
 *
 * @returns {Promise<import("fastify").FastifyInstance>} A ready Fastify instance.
 */
async function buildApp() {
  const app = Fastify();
  await app.register(rateLimit, {
    max: MAX,
    timeWindow: WINDOW_MS,
    keyGenerator: (request) => String(request.headers["x-wallet-address"] ?? request.ip),
  });
  app.get("/v1/api/events", async () => []);
  await app.ready();
  return app;
}

/**
 * Sends a single `GET /v1/api/events` request to the app.
 *
 * @param {import("fastify").FastifyInstance} app - The Fastify instance to inject into.
 * @param {string} [wallet="GWALLET1"] - Wallet address used as the rate-limit key.
 * @returns {Promise<import("light-my-request").Response>} The injected response.
 */
const hit = (app: Awaited<ReturnType<typeof buildApp>>, wallet = "GWALLET1") =>
  app.inject({ method: "GET", url: "/v1/api/events", headers: { "x-wallet-address": wallet } });

/**
 * Verifies the rate-limit contract for `GET /v1/api/events`.
 *
 * Request shape: `GET /v1/api/events` with an `x-wallet-address` header used
 * as the rate-limit key.
 * Response shape: `200` with a JSON array body while under the limit; `429`
 * once the limit is exceeded for the same key.
 *
 * Asserts that:
 * - the first `MAX` requests succeed (`200`),
 * - the next request for the same key is rejected (`429`),
 * - a different key is unaffected (`200`),
 * - the window resets after `WINDOW_MS`, allowing requests again (`200`).
 */
test("requests up to the limit succeed, the next gets 429, and the window resets", async () => {
  const app = await buildApp();
  try {
    for (let i = 0; i < MAX; i++) {
      assert.equal((await hit(app)).statusCode, 200);
    }
    assert.equal((await hit(app)).statusCode, 429);
    assert.equal((await hit(app, "GWALLET2")).statusCode, 200);

    await delay(WINDOW_MS + 100);
    assert.equal((await hit(app)).statusCode, 200);
  } finally {
    await app.close();
  }
});