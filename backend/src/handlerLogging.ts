import type { FastifyReply, FastifyRequest } from "fastify";

type DomainFields = Record<string, string | number | undefined>;

export function logHandlerStart(
  request: FastifyRequest,
  handler: string,
  fields: DomainFields = {},
): void {
  request.log.info({ handler, ...fields }, "Handler started");
}

export function logHandlerError(
  request: FastifyRequest,
  handler: string,
  error: unknown,
  fields: DomainFields = {},
): void {
  request.log.error({ handler, err: error, ...fields }, "Handler failed");
}

export function logHandlerSuccess(
  request: FastifyRequest,
  handler: string,
  fields: DomainFields = {},
): void {
  request.log.info({ handler, ...fields }, "Handler completed");
}

export async function withHandlerLogging<T>(
  request: FastifyRequest,
  reply: FastifyReply,
  handler: string,
  fields: DomainFields,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  logHandlerStart(request, handler, fields);
  try {
    const result = await fn();
    logHandlerSuccess(request, handler, fields);
    return result;
  } catch (error) {
    logHandlerError(request, handler, error, fields);
    reply.code(500).send({ error: "internal_error" });
    return undefined;
  }
}