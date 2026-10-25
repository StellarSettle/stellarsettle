import type { rpc } from "@stellar/stellar-sdk";

type EventsPage = Awaited<ReturnType<rpc.Server["getEvents"]>>;
export type ContractEvent = EventsPage["events"][number];
export type RetentionGap = { fromLedger: number; toLedger: number };
export type ScanCheckpoint = { lastScannedLedger?: number; retentionGap?: RetentionGap };
type RpcClient = Pick<rpc.Server, "getHealth" | "getEvents">;
type Logger = { info(data: object, message: string): void; warn(data: object, message: string): void };

export class EventMonitor {
  private checkpoint: ScanCheckpoint;
  private range?: { start: number; end: number; cursor?: string };
  private initialized = false;
  private target?: number;
  private startupComplete = false;

  constructor(private readonly options: {
    rpc: RpcClient;
    contractId: string;
    checkpoint: ScanCheckpoint;
    startLedger?: number;
    backfillFromLedger?: number;
    maxPages: number;
    save: (checkpoint: ScanCheckpoint) => void;
    process: (event: ContractEvent) => void;
    log: Logger;
  }) {
    this.checkpoint = { ...options.checkpoint };
  }

  get lastScannedLedger(): number | undefined { return this.checkpoint.lastScannedLedger; }

  get backfill() {
    return {
      status: !this.initialized ? "pending" : this.startupComplete ? "complete" : "running",
      targetLedger: this.target ?? null,
      retentionGap: this.checkpoint.retentionGap ?? null,
    };
  }

  // Each pass has a fixed page budget. Unfinished pagination continues on the
  // next timer tick; a restart safely replays the unfinished ledger chunk.
  async scan(): Promise<void> {
    const health = await this.options.rpc.getHealth();
    const { oldestLedger, latestLedger } = health;
    if (health.status !== "healthy" || !Number.isSafeInteger(oldestLedger) ||
        !Number.isSafeInteger(latestLedger) || oldestLedger < 1 || latestLedger < oldestLedger) {
      throw new Error("RPC did not provide a valid retained ledger window");
    }

    if (!this.initialized) {
      const from = this.options.backfillFromLedger ??
        ((this.options.startLedger ?? this.checkpoint.lastScannedLedger ?? Math.max(0, latestLedger - 10)) + 1);
      this.checkpoint = { ...this.checkpoint, lastScannedLedger: from - 1 };
      this.target = latestLedger;
      this.initialized = true;
      this.options.log.info({ fromLedger: from, targetLedger: latestLedger }, "Starting bounded event backfill");
    }

    let next = this.range?.start ?? (this.checkpoint.lastScannedLedger! + 1);
    if (next < oldestLedger) {
      const gap = { fromLedger: next, toLedger: oldestLedger - 1 };
      // Keep this warning in health/checkpoint state even after catching up.
      // Logs retain the individual intervals if another retention gap occurs.
      const state = { ...this.checkpoint, retentionGap: gap };
      this.options.log.warn({ ...gap, oldestLedger, latestLedger },
        "Event history gap exceeds RPC retention; missing ledgers cannot be recovered from this RPC");
      this.options.save(state);
      this.checkpoint = state;
      this.range = { start: oldestLedger, end: Math.min(oldestLedger + 1000, latestLedger + 1) };
      next = oldestLedger;
    }

    const filters = [{ type: "contract" as const, contractIds: [this.options.contractId] }];
    for (let pages = 0; pages < this.options.maxPages && next <= latestLedger; pages++) {
      this.range ??= { start: next, end: Math.min(next + 1000, latestLedger + 1) };
      const range = this.range;
      const page = range.cursor
        ? await this.options.rpc.getEvents({ cursor: range.cursor, filters, limit: 100 })
        : await this.options.rpc.getEvents({ startLedger: range.start, endLedger: range.end, filters, limit: 100 });
      let reachedEnd = false;
      for (const event of page.events) {
        // Cursor requests cannot also carry endLedger. Stop at the captured
        // exclusive bound, even if the RPC now includes newer ledgers.
        if (event.ledger >= range.end) { reachedEnd = true; break; }
        if (!Number.isSafeInteger(event.ledger) || event.ledger < range.start) {
          throw new Error("RPC returned an event outside the requested ledger range");
        }
        this.options.process(event);
      }
      if (reachedEnd || page.events.length < 100) {
        const state = { ...this.checkpoint, lastScannedLedger: range.end - 1 };
        // Event writes happen first; advancing only after a complete range
        // makes crash/retry delivery at-least-once (the DB deduplicates IDs).
        this.options.save(state);
        this.checkpoint = state;
        this.range = undefined;
        next = state.lastScannedLedger + 1;
      } else {
        if (!page.cursor || page.cursor === range.cursor) {
          throw new Error("RPC event pagination did not advance; checkpoint retained");
        }
        range.cursor = page.cursor;
      }
    }
    if (!this.startupComplete && this.checkpoint.lastScannedLedger! >= this.target!) {
      this.startupComplete = true;
      this.options.log.info({ lastScannedLedger: this.lastScannedLedger }, "Startup event backfill complete");
    }
  }
}
