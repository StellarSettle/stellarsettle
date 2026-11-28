import type { FastifyReply, FastifyRequest } from "fastify";
import { Keypair } from "@stellar/stellar-sdk";

export type StellarAuthOptions = {
  enabled: boolean;
};

export function verifyStellarChallenge(request: FastifyRequest, reply: FastifyReply): boolean {
  const address = String(request.headers["x-stellar-address"] ?? "").trim();
  const signature = String(request.headers["x-stellar-signature"] ?? "").trim();
  const challenge = String(request.headers["x-stellar-challenge"] ?? "").trim();

  if (!address || !signature || !challenge) {
    reply.code(401).send({ error: "stellar_auth_required" });
    return false;
  }

  try {
    const keypair = Keypair.fromPublicKey(address);
    const valid = keypair.verify(
      Buffer.from(challenge, "utf8"),
      Buffer.from(signature, "base64"),
    );
    if (!valid) {
      reply.code(401).send({ error: "stellar_auth_invalid" });
      return false;
    }
    return true;
  } catch {
    reply.code(401).send({ error: "stellar_auth_invalid" });
    return false;
  }
}

export function registerStellarSignatureAuth(app: import("fastify").FastifyInstance): void {
  app.addHook("preHandler", async (request, reply) => {
    const route = request.routeOptions.url ?? "";
    const isMetadataMutation =
      route.includes("/v1/api/metadata/") &&
      ["PUT", "PATCH", "POST"].includes(request.method);
    if (!isMetadataMutation) return;
    verifyStellarChallenge(request, reply);
  });
}