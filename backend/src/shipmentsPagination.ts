import type { FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function registerShipmentPagination(app: FastifyInstance, database: DatabaseSync): void {
  app.get<{ Querystring: { cursor?: string; limit?: string } }>(
    "/v1/api/shipments/list",
    {
      schema: {
        tags: ["shipments"],
        querystring: {
          type: "object",
          properties: {
            cursor: { type: "string", description: "Opaque cursor from prior page" },
            limit: { type: "integer", minimum: 1, maximum: 100 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: { type: "object" } },
              nextCursor: { type: ["string", "null"] },
            },
            required: ["data", "nextCursor"],
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = querySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_pagination", details: parsed.error.flatten() });
      }
      const offset = Math.max(0, Number(parsed.data.cursor ?? 0) || 0);
      const limit = parsed.data.limit;
      const rows = database
        .prepare(
          `SELECT DISTINCT shipment_id AS id, MAX(updated_at) AS updatedAt
           FROM shipment_metadata
           GROUP BY shipment_id
           ORDER BY updatedAt DESC
           LIMIT ? OFFSET ?`,
        )
        .all(limit + 1, offset) as Array<{ id: string; updatedAt: string }>;

      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? String(offset + limit) : null;
      return { data, nextCursor };
    },
  );
}