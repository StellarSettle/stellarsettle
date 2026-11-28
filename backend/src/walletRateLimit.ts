import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";

export async function registerWalletMutationRateLimit(
  app: FastifyInstance,
  options: { max: number; timeWindow: number },
): Promise<void> {
  await app.register(rateLimit, {
    global: false,
    max: options.max,
    timeWindow: options.timeWindow,
    keyGenerator: (request) =>
      String(request.headers["x-stellar-address"] ?? request.headers["x-wallet-address"] ?? request.ip),
    addHeaders: { "retry-after": true },
  });

  const mutationPaths = new Set([
    "/v1/api/metadata",
    "/v1/api/metadata/:shipmentId/:key",
  ]);

  app.addHook("onRoute", (routeOptions) => {
    const url = routeOptions.url;
  if (url && (mutationPaths.has(url) || url.startsWith("/v1/api/metadata/"))) {
      const methods = routeOptions.method;
      const isMutation = Array.isArray(methods)
        ? methods.some((m) => ["POST", "PUT", "PATCH", "DELETE"].includes(m))
        : ["POST", "PUT", "PATCH", "DELETE"].includes(String(methods));
      if (isMutation) {
        routeOptions.config = {
          ...(routeOptions.config ?? {}),
          rateLimit: { max: options.max, timeWindow: options.timeWindow },
        };
      }
    }
  });
}