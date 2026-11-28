import assert from "node:assert/strict";
import { test } from "node:test";
import { Keypair } from "@stellar/stellar-sdk";
import Fastify from "fastify";
import { registerStellarSignatureAuth } from "./stellarSignatureAuth.ts";

test("metadata mutation without signature returns 401", async () => {
  const app = Fastify({ logger: false });
  registerStellarSignatureAuth(app);
  app.patch("/v1/api/metadata/:shipmentId/:key", async () => ({ ok: true }));
  await app.ready();
  try {
    const res = await app.inject({
      method: "PATCH",
      url: "/v1/api/metadata/SHIP-1/po",
      payload: { value: "x" },
    });
    assert.equal(res.statusCode, 401);
  } finally {
    await app.close();
  }
});

test("metadata mutation with valid signature passes", async () => {
  const kp = Keypair.random();
  const challenge = "stellarsettle-metadata-update";
  const signature = kp.sign(Buffer.from(challenge, "utf8")).toString("base64");

  const app = Fastify({ logger: false });
  registerStellarSignatureAuth(app);
  app.patch("/v1/api/metadata/:shipmentId/:key", async () => ({ ok: true }));
  await app.ready();
  try {
    const res = await app.inject({
      method: "PATCH",
      url: "/v1/api/metadata/SHIP-1/po",
      headers: {
        "x-stellar-address": kp.publicKey(),
        "x-stellar-challenge": challenge,
        "x-stellar-signature": signature,
      },
      payload: { value: "x" },
    });
    assert.equal(res.statusCode, 200);
  } finally {
    await app.close();
  }
});