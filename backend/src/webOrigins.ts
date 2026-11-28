import { z } from "zod";

function parseWebOrigins(value: unknown): unknown {
  if (typeof value === "string") return value.split(",").map((origin) => origin.trim()).filter(Boolean);
  if (Array.isArray(value)) return value.map((origin) => typeof origin === "string" ? origin.trim() : origin);
  return value;
}

export const webOriginsSchema = z.preprocess(
  parseWebOrigins,
  z.array(z.string().url()).min(1).default(["http://localhost:5173"]),
);

export function isAllowedWebOrigin(origin: string | undefined, allowedOrigins: readonly string[]): origin is string {
  return origin !== undefined && allowedOrigins.includes(origin);
}
