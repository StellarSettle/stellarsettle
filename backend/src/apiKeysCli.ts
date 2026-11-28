// Usage: npx tsx src/apiKeysCli.ts create <name> | revoke <name>
import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { createApiKey, initApiKeys, revokeApiKey } from "./apiKeys.js";

const [command, name] = process.argv.slice(2);
if (!name || (command !== "create" && command !== "revoke")) {
  console.error("Usage: tsx src/apiKeysCli.ts create <name> | revoke <name>");
  process.exit(1);
}

const db = new DatabaseSync(resolve(process.env.DATABASE_PATH ?? "./data/stellarsettle.sqlite"));
initApiKeys(db, process.env.METADATA_API_KEY ?? "");
if (command === "create") {
  console.log(createApiKey(db, name));
} else if (!revokeApiKey(db, name)) {
  console.error(`No active key named "${name}"`);
  process.exitCode = 1;
}
db.close();
