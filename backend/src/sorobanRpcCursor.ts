import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type RpcEventCursor = {
  ledgerCursor?: number;
  pageCursor?: string;
  updatedAt: string;
};

export function createRpcCursorStore(filePath: string) {
  const path = resolve(filePath);
  mkdirSync(dirname(path), { recursive: true });

  function load(): RpcEventCursor | undefined {
    try {
      const raw = readFileSync(path, "utf8");
      return JSON.parse(raw) as RpcEventCursor;
    } catch {
      return undefined;
    }
  }

  function save(cursor: Omit<RpcEventCursor, "updatedAt">): void {
    const payload: RpcEventCursor = { ...cursor, updatedAt: new Date().toISOString() };
    writeFileSync(path, JSON.stringify(payload, null, 2), "utf8");
  }

  return { load, save };
}