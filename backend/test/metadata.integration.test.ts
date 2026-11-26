import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { DatabaseSync } from "node:sqlite";
import { initDatabase } from "../src/index.ts";
import { registerMetadataApi } from "../src/metadataApi.ts";

async function buildTestApp() {
  const database = new DatabaseSync(":memory:");
  initDatabase(database);
  const app = Fastify({ logger: false });
  registerMetadataApi(app, database, { apiKey: "test-key" });
  await app.ready();
  return { app, database };
}

test("metadata API: POST, GET, PATCH, and 404 for unknown shipment", async () => {
  const { app, database } = await buildTestApp();
  try {
    const created = await app.inject({
      method: "POST",
      url: "/v1/api/metadata",
      headers: { "x-api-key": "test-key" },
      payload: { shipmentId: "SHIP-227", metadata: { po_number: "PO-1" } },
    });
    assert.equal(created.statusCode, 201);

    const fetched = await app.inject({ method: "GET", url: "/v1/api/metadata/SHIP-227" });
    assert.equal(fetched.statusCode, 200);
    const body = fetched.json() as Record<string, { value: string }>;
    assert.equal(body.po_number.value, "PO-1");

    const patched = await app.inject({
      method: "PATCH",
      url: "/v1/api/metadata/SHIP-227/milestone_note",
      headers: { "x-api-key": "test-key" },
      payload: { value: "cleared customs" },
    });
    assert.equal(patched.statusCode, 204);

    const afterPatch = await app.inject({ method: "GET", url: "/v1/api/metadata/SHIP-227" });
    assert.equal((afterPatch.json() as Record<string, { value: string }>).milestone_note.value, "cleared customs");

    const missing = await app.inject({ method: "GET", url: "/v1/api/metadata/UNKNOWN-404" });
    assert.equal(missing.statusCode, 404);
  } finally {
    database.close();
    await app.close();
  }
});