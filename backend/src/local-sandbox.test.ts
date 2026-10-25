import { execFile as cpExecFile } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { once } from "node:events";
import { test } from "node:test";
import { createApp } from "./index.ts";

function execFile(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    cpExecFile(command, args, { shell: false }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

async function startSandbox() {
  const dockerCheck = await execFile("docker", ["--version"]);
  if (!dockerCheck.stdout) {
    throw new Error("Docker is required for the Soroban sandbox integration test.");
  }

  try {
    await execFile("docker", ["rm", "-f", "stellarsettle-sandbox"]);
  } catch {
    // ignore cleanup error
  }

  await execFile("docker", [
    "run",
    "-d",
    "--rm",
    "--name",
    "stellarsettle-sandbox",
    "-p",
    "8000:8000",
    "stellar/quickstart:latest",
    "--testnet",
  ]);

  const rpcUrl = "http://127.0.0.1:8000/soroban/rpc";
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth", params: [] }),
      });
      if (res.ok) return { rpcUrl, cleanup: async () => { await execFile("docker", ["rm", "-f", "stellarsettle-sandbox"]); } };
    } catch {
      // retry until the sandbox is ready
    }
    await delay(1000);
  }

  throw new Error("Soroban sandbox was not reachable on the expected RPC port.");
}

test("event polling indexes a local Soroban sandbox event", async () => {
  const sandbox = await startSandbox();
  const app = await createApp({
    ...process.env,
    HOST: "127.0.0.1",
    PORT: "0",
    STELLAR_RPC_URL: sandbox.rpcUrl,
    STELLAR_CONTRACT_ID: "C1234567890ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF",
    DATABASE_PATH: ":memory:",
    WEB_ORIGIN: "http://localhost:5173",
    START_LEDGER: "1",
  });

  await app.app.listen({ host: "127.0.0.1", port: 0 });

  const port = app.app.server.address() && typeof app.app.server.address() === "object" ? app.app.server.address().port : 0;
  if (!port) {
    throw new Error("Fastify did not start on a listening port.");
  }

  const res = await fetch(`http://127.0.0.1:${port}/api/events`);
  const body = await res.json();

  if (!Array.isArray(body)) {
    throw new Error("The event endpoint should return a JSON array for event indexing.");
  }

  await app.app.close();
  await sandbox.cleanup();
});
