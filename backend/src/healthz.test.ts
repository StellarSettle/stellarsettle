import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { registerHealthz } from "./healthz.ts";

test("GET /healthz returns 200 when RPC is healthy", async () => {
  const app = Fastify({ logger: false });
  registerHealthz(app, () => true);
  await app.ready();
  try {
    const res = await app.inject({ method: "GET", url: "/healthz" });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { status: "ok" });
  } finally {
    await app.close();
  }
});

test("GET /healthz returns 503 when RPC is unreachable", async () => {
  const app = Fastify({ logger: false });
  registerHealthz(app, () => false);
  await app.ready();
  try {
    const res = await app.inject({ method: "GET", url: "/healthz" });
    assert.equal(res.statusCode, 503);
    assert.equal(res.json().status, "degraded");
  } finally {
    await app.close();
  }
});