import type { FastifyInstance } from "fastify";

const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

/**
 * Enforces request schema validation on every route (#226).
 *  - Fastify validates inbound bodies with ajv when a route declares `schema.body`;
 *    this plugin refuses to register any POST/PUT/PATCH route without one.
 *  - Validation failures are returned as 400 with the schema error details
 *    before the handler runs.
 * Must be called before the routes are registered.
 */
export function registerSchemaValidation(app: FastifyInstance): void {
  app.addHook("onRoute", (route) => {
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    if (!methods.some((m) => BODY_METHODS.has(String(m).toUpperCase()))) return;
    const schema = route.schema as { body?: unknown } | undefined;
    if (!schema?.body) {
      throw new Error(`Route ${methods.join(",")} ${route.url} must declare a request body schema`);
    }
  });

  app.setErrorHandler((error, request, reply) => {
    const validation = (error as { validation?: Array<{ instancePath?: string; message?: string; keyword?: string }> }).validation;
    if (validation) {
      return reply.status(400).send({
        error: "Request validation failed",
        details: validation.map((v) => ({
          path: v.instancePath || "/",
          keyword: v.keyword,
          message: v.message,
        })),
      });
    }
    return reply.send(error);
  });
}
