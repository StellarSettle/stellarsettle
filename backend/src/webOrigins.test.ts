import assert from "node:assert/strict";
import { test } from "node:test";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { isAllowedWebOrigin, webOriginsSchema } from "./webOrigins.ts";

test("CORS accepts each configured origin and omits the header for unlisted origins", async () => {
  const allowedOrigins = webOriginsSchema.parse("http://localhost:5173, https://staging.example.com");
  const app = Fastify();
  await app.register(cors, { origin: allowedOrigins });
  app.get("/", async () => ({ status: "ok" }));

  try {
    for (const origin of allowedOrigins) {
      const response = await app.inject({ method: "GET", url: "/", headers: { origin } });
      assert.equal(response.headers["access-control-allow-origin"], origin);
    }

    const rejectedOrigin = "https://unlisted.example.com";
    const rejected = await app.inject({ method: "GET", url: "/", headers: { origin: rejectedOrigin } });
    assert.equal(rejected.headers["access-control-allow-origin"], undefined);
    assert.equal(isAllowedWebOrigin(rejectedOrigin, allowedOrigins), false);
  } finally {
    await app.close();
  }
});

test("WEB_ORIGIN keeps its default and accepts origin arrays", () => {
  assert.deepEqual(webOriginsSchema.parse(undefined), ["http://localhost:5173"]);
  assert.deepEqual(webOriginsSchema.parse(["http://localhost:5173", "https://staging.example.com"]), [
    "http://localhost:5173",
    "https://staging.example.com",
  ]);
});
