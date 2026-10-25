# StellarSettle Backend

Node.js API and Soroban RPC event monitor for shipment escalation alerts, lifecycle events (`shipment_completed`, `shipment_cancelled`), and off-chain shipment metadata.

## Local setup

```sh
cp .env.example .env
npm install
npm run dev
```

Set `STELLAR_CONTRACT_ID` to enable the event monitor. By default, it scans recent contract events on Testnet and persists `dispute_escalated`, `shipment_completed`, and `shipment_cancelled` events as well as metadata in a local SQLite database. The API exposes `GET /api/health`, `GET /api/events`, `GET /api/stream` (SSE), shipment endpoints, and metadata read/write endpoints. Metadata writes are disabled until a non-empty `METADATA_API_KEY` is configured; keep that key on the server and never expose it in frontend variables.

The event monitor resumes from a SQLite checkpoint on restart and automatically backfills missed, retained ledgers. This service does not sign or submit contract transactions; the connected wallet remains responsible for user-authorized actions.

```sh
npm run typecheck
npm test
npm run build
npm start
```

## Startup backfill and recovery

Keep `DATABASE_PATH` on persistent storage. Checkpoints are scoped to the configured network and contract and advance only after a complete ledger chunk has been processed, including chunks with no matching events. Interrupted chunks are replayed on restart; existing event IDs are deduplicated before SSE delivery.

The first ledger to scan is selected in this order:

1. `BACKFILL_FROM_LEDGER`: an **inclusive** recovery override (positive ledger number).
2. `START_LEDGER`: the legacy **exclusive** override (the first request starts at this value plus one).
3. The saved checkpoint plus one.
4. On a fresh database, the latest ten ledgers. An existing database from before checkpoint support also uses this fallback; set a recovery override if older history is required.

Blank environment values count as unset. Remove explicit ledger overrides after recovery so subsequent restarts use the saved checkpoint.

Each pass makes at most `BACKFILL_MAX_PAGES` event requests (default `10`, allowed `1`–`100`), plus one retention-health request. Requests cover chunks of at most 1,000 ledgers and pages of 100 events. Startup runs one bounded pass before listening; remaining work continues every `POLL_INTERVAL_MS`, without overlapping polls. This limits requests per pass, not wall-clock duration. Failed requests retain the last completed checkpoint for retry. Cursor pagination carries across passes; RPC `endLedger` is exclusive, so the latest ledger is included using `latestLedger + 1`.

Retention is obtained from the RPC's [`getHealth` ledger window](https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getHealth), rather than assuming a fixed number of days. If the next required ledger is older than `oldestLedger`, the monitor logs an explicit warning with `fromLedger` and `toLedger`, records the unavailable interval, and resumes at the oldest retained ledger. Those missing events **cannot be recovered from that RPC**. Invalid retention information fails the poll rather than silently skipping history.

`GET /api/health` includes `lastScannedLedger` and `backfill` with `status` (`pending`, `running`, or `complete`), the startup `targetLedger`, and `retentionGap` (`null` or `{ fromLedger, toLedger }`). Completion means the retained startup range has been scanned; it does not mean expired history was recovered. The most recently detected gap remains recorded across catch-up and restarts; logs preserve earlier gap intervals. `backfill` is `null` when no contract is configured.

To recover a reported gap, use an RPC provider that still retains the required range and set `BACKFILL_FROM_LEDGER` to its first missing ledger, then restart. Checkpoint scope deliberately excludes the RPC URL so changing providers preserves progress. Remove the override after recovery. The historical gap warning remains available for operator audit even after an explicit replay; inspect recovery logs and stored events to verify that replay. If no provider retains the range, an external archival source is required; this service does not fabricate or silently mark that history as recovered.

## API Endpoints

### Health & Events

- **GET /api/health** — Check service status, network, and event monitor state
- **GET /api/events** — Retrieve paginated `dispute_escalated`, `shipment_completed`, and `shipment_cancelled` events (query params: `after` ledger, `limit` max 100, optional `type` and `shipmentId`)
- **GET /api/stream** — Server-Sent Events stream of contract events (SSE)

### Stats

- **GET /api/stats** — Contract-wide aggregate metrics for dashboard/landing widgets (#56)
  - Returns: `{ totalShipments, totalVolume, totalDisputes, completedShipments, totalEscrowed?, fetchedAt }`
  - `totalVolume` is returned as a string to preserve i128 precision (stroops)
  - `totalEscrowed` is included only when `STELLAR_STATS_TOKEN` env var is set to a token SAC address
  - Results are cached in-memory for 30 seconds (`x-cache` header: `hit` / `miss` / `stale`)
  - Returns 503 if `STELLAR_CONTRACT_ID` is not configured or the contract call fails
  - Description: Aggregates on-chain figures from the contract's `get_contract_stats` and `get_total_escrowed_value` read functions

### Shipments

- **GET /api/shipments** — List shipment IDs with pagination (query params: `after` cursor, `limit` max 100)
  - Returns: `{ shipments: string[], nextCursor?: number }`
  - Description: Proxies contract's `list_shipments` function with pagination support matching `/api/events` style
  
- **GET /api/shipments/:id** — Retrieve full shipment details
  - Response: Full `Shipment` struct (all 51+ fields)
  - Returns 404 if shipment ID not found
  - Description: Reads full shipment state via Soroban RPC
  
- **GET /api/shipments/:id/milestones** — List all milestones for a shipment with notes
  - Response: `{ milestones: Array<Milestone & { notes: MilestoneNote[] }> }`
  - Returns 404 if shipment ID not found
  - Description: Returns milestone list with status, proof hash, and associated notes for each milestone

- **GET /api/shipments/:id/warranty** — Retrieve warranty status and any filed claim for a shipment
  - Response: `{ warrantyEndLedger: number | null, balance: string | null, claim: WarrantyClaim | null }`
  - `claim` is `null` when no warranty claim has been filed for the shipment
  - Returns 404 if shipment ID not found
  - Description: Reads `get_warranty_claim`, `get_warranty_balance`, and `get_warranty_end_ledger` via Soroban RPC; `warrantyEndLedger` is included for display

### Metadata

- **GET /api/metadata/:shipmentId** — Retrieve all metadata for a shipment
  - Returns: `{ [key: string]: { value: string, updatedAt: string } }`

- **PUT /api/metadata/:shipmentId/:key** — Store off-chain metadata (requires `X-API-Key` header)
  - Body: `{ value: string }`
  - Returns 401 if `METADATA_API_KEY` not configured or mismatched
  - Returns 400 if value exceeds 4000 characters

### Templates

- **GET /api/templates** — List saved milestone templates from the contract
  - Query params: `owner` (optional Stellar address to filter by owner), `nocache` (any value bypasses cache)
  - Returns: `{ templates: MilestoneTemplate[] }` sorted in stable contract order
  - Proxies contract's `list_milestone_templates` function

### Deadlines

- **GET /api/deadlines/upcoming** — List milestones approaching their deadline
  - Query params: `withinLedgers` (default 200), `nocache` (any value bypasses cache)
  - Returns: `{ withinLedgers: number, milestones: MilestoneDeadline[] }` sorted by nearest deadline first
  - Proxies contract's `get_upcoming_deadlines` and annotates results with `check_deadline_warning`

### Admin Log

- **GET /api/admin-log** — Retrieve the on-chain admin action audit log (requires `X-API-Key` header)
  - Query params: `action` (optional action type filter), `fromLedger` (optional), `toLedger` (optional), `nocache` (any value bypasses cache)
  - Returns: `{ entries: AdminAction[], filters: { action, fromLedger, toLedger } }`
  - Requires the same `METADATA_API_KEY` used for metadata writes
  - Proxies contract's `get_admin_log` or `get_admin_log_filtered` depending on filters provided

## Response Cache

Read-only contract query endpoints (`/api/templates`, `/api/deadlines/upcoming`, `/api/admin-log`) use a
short-lived in-memory cache to avoid redundant Soroban RPC calls:

| Endpoint | Default TTL |
|---|---|
| `/api/templates` | 60 s |
| `/api/deadlines/upcoming` | 30 s |
| `/api/admin-log` | 15 s |

Append `?nocache=1` to any of these endpoints to bypass the cache and force a fresh RPC call. This is
useful for debugging or when you need the absolute latest on-chain state. The cache is process-local and
is not shared across server restarts or multiple instances.