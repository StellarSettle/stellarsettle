import { test } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { registerSchemaValidation } from "./schemaValidation.js";

test("returns 400 with schema error details for an invalid body", async () => {
    const app = Fastify();
    registerSchemaValidation(app);
    app.post(
      "/x",
      { schema: { body: { type: "object", required: ["a"], properties: { a: { type: "string" } } } } },
      async () => ({ ok: true }),
    );
    const res = await app.inject({ method: "POST", url: "/x", payload: { a: 1 } });
    assert.equal(res.statusCode, 400);
    assert.ok(res.json().details.length > 0);
    const ok = await app.inject({ method: "POST", url: "/x", payload: { a: "s" } });
    assert.equal(ok.statusCode, 200);
  });

test("rejects registering a POST route without a body schema", async () => {
    const app = Fastify();
    registerSchemaValidation(app);
    assert.throws(() => app.post("/y", async () => ({})), /body schema/);
  });
