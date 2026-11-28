import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { DatabaseSync } from "node:sqlite";
import { initDatabase } from "../src/index.ts";
import { registerShipmentPagination } from "../src/shipmentsPagination.ts";

test("shipment list pagination traverses multiple pages", async () => {
  const db = new DatabaseSync(":memory:");
  initDatabase(db);
  const insert = db.prepare(
    "INSERT INTO shipment_metadata (shipment_id, metadata_key, value) VALUES (?, 'k', ?)",
  );
  for (let i = 0; i < 5; i += 1) insert.run(`SHIP-${i}`, `v${i}`);

  const app = Fastify({ logger: false });
  registerShipmentPagination(app, db);
  await app.ready();

  try {
    const page1 = await app.inject({ method: "GET", url: "/v1/api/shipments/list?limit=2" });
    assert.equal(page1.statusCode, 200);
    const body1 = page1.json() as { data: unknown[]; nextCursor: string | null };
    assert.equal(body1.data.length, 2);
    assert.ok(body1.nextCursor);

    const page2 = await app.inject({
      method: "GET",
      url: `/v1/api/shipments/list?limit=2&cursor=${body1.nextCursor}`,
    });
    const body2 = page2.json() as { data: unknown[]; nextCursor: string | null };
    assert.equal(body2.data.length, 2);
    assert.ok(body2.nextCursor);
  } finally {
    await app.close();
    db.close();
  }
});