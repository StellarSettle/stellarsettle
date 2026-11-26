import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { logHandlerError, logHandlerStart, logHandlerSuccess } from "./handlerLogging.ts";

const keySchema = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const createBodySchema = z.object({
  shipmentId: z.string().min(1),
  metadata: z.record(z.string(), z.string()).default({}),
});
const patchBodySchema = z.object({ value: z.string().max(4000) });

export function registerMetadataApi(
  app: FastifyInstance,
  database: DatabaseSync,
  options: { apiKey?: string } = {},
): void {
  const requireWriteAuth = (request: FastifyRequest, reply: FastifyReply): boolean => {
    if (!options.apiKey || request.headers["x-api-key"] === options.apiKey) return true;
    reply.code(401).send({ error: "metadata_write_unauthorized" });
    return false;
  };

  const shipmentExists = (shipmentId: string): boolean => {
    const row = database
      .prepare("SELECT 1 FROM shipment_metadata WHERE shipment_id = ? LIMIT 1")
      .get(shipmentId);
    return Boolean(row);
  };

  app.post<{ Body: unknown }>("/v1/api/metadata", async (request, reply) => {
    logHandlerStart(request, "metadata.create", {});
    if (!requireWriteAuth(request, reply)) {
      logHandlerError(request, "metadata.create", new Error("unauthorized"));
      return;
    }
    const parsed = createBodySchema.safeParse(request.body);
    if (!parsed.success) {
      logHandlerError(request, "metadata.create", parsed.error);
      return reply.code(400).send({ error: "invalid_body" });
    }
    const { shipmentId, metadata } = parsed.data;
    const insert = database.prepare(
      `INSERT INTO shipment_metadata (shipment_id, metadata_key, value, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(shipment_id, metadata_key)
       DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    );
    for (const [key, value] of Object.entries(metadata)) {
      if (!keySchema.safeParse(key).success) {
        logHandlerError(request, "metadata.create", new Error("invalid key"), { shipment_id: shipmentId });
        return reply.code(400).send({ error: "invalid_metadata_key", key });
      }
      insert.run(shipmentId, key, value);
    }
    if (Object.keys(metadata).length === 0) {
      database
        .prepare(
          `INSERT INTO shipment_metadata (shipment_id, metadata_key, value)
           VALUES (?, '__init__', '')
           ON CONFLICT DO NOTHING`,
        )
        .run(shipmentId);
    }
    logHandlerSuccess(request, "metadata.create", { shipment_id: shipmentId });
    return reply.code(201).send({ shipmentId });
  });

  app.get<{ Params: { shipmentId: string } }>("/v1/api/metadata/:shipmentId", async (request, reply) => {
    const { shipmentId } = request.params;
    logHandlerStart(request, "metadata.get", { shipment_id: shipmentId });
    if (!shipmentExists(shipmentId)) {
      logHandlerError(request, "metadata.get", new Error("not_found"), { shipment_id: shipmentId });
      return reply.code(404).send({ error: "shipment_not_found" });
    }
    const rows = database
      .prepare(
        `SELECT metadata_key AS key, value, updated_at AS updatedAt
         FROM shipment_metadata WHERE shipment_id = ? AND metadata_key != '__init__' ORDER BY metadata_key`,
      )
      .all(shipmentId) as Array<{ key: string; value: string; updatedAt: string }>;
    logHandlerSuccess(request, "metadata.get", { shipment_id: shipmentId, milestone_index: rows.length });
    return Object.fromEntries(rows.map((row) => [row.key, { value: row.value, updatedAt: row.updatedAt }]));
  });

  app.patch<{ Params: { shipmentId: string; key: string }; Body: unknown }>(
    "/v1/api/metadata/:shipmentId/:key",
    async (request, reply) => {
      const { shipmentId, key } = request.params;
      logHandlerStart(request, "metadata.patch", { shipment_id: shipmentId, metadata_key: key });
      if (!requireWriteAuth(request, reply)) {
        logHandlerError(request, "metadata.patch", new Error("unauthorized"), { shipment_id: shipmentId });
        return;
      }
      if (!keySchema.safeParse(key).success) {
        logHandlerError(request, "metadata.patch", new Error("invalid key"), { shipment_id: shipmentId });
        return reply.code(400).send({ error: "invalid_metadata_key" });
      }
      if (!shipmentExists(shipmentId)) {
        logHandlerError(request, "metadata.patch", new Error("not_found"), { shipment_id: shipmentId });
        return reply.code(404).send({ error: "shipment_not_found" });
      }
      const parsed = patchBodySchema.safeParse(request.body);
      if (!parsed.success) {
        logHandlerError(request, "metadata.patch", parsed.error, { shipment_id: shipmentId });
        return reply.code(400).send({ error: "invalid_body" });
      }
      database
        .prepare(
          `INSERT INTO shipment_metadata (shipment_id, metadata_key, value, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(shipment_id, metadata_key)
           DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        )
        .run(shipmentId, key, parsed.data.value);
      logHandlerSuccess(request, "metadata.patch", { shipment_id: shipmentId, metadata_key: key });
      return reply.code(204).send();
    },
  );
}