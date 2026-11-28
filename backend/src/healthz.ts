import type { FastifyInstance } from "fastify";

export function registerHealthz(app: FastifyInstance, isRpcHealthy: () => boolean): void {
  app.get("/healthz", async (_request, reply) => {
    if (isRpcHealthy()) {
      return { status: "ok" };
    }
    return reply.code(503).send({ status: "degraded", rpc: "unreachable" });
  });
}