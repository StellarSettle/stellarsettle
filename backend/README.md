# StellarSettle Backend

Node.js API and Soroban RPC event monitor for the StellarSettle escrow contract.
Monitors `dispute_escalated` events on-chain, persists them in a local SQLite
database, streams real-time alerts to the frontend over SSE, and provides a
read-only proxy for shipment and milestone data together with an optional
off-chain metadata write endpoint.

## Requirements

- Node.js **≥ 22.5**
- A deployed StellarSettle contract (optional — the server starts without one and
  the event monitor is simply disabled)

## Setup

```sh
cp .env.example .env
# Edit .env — at minimum set STELLAR_CONTRACT_ID
npm install
npm run dev        # ts-node watch mode
```

The server starts on `http://127.0.0.1:8787` by default.

For a production build:

```sh
npm run build      # compiles to dist/
npm start          # runs dist/index.js
```

Type-check without building:

```sh
npm run typecheck
```

---

## Environment variables

All variables are validated at startup via a `zod` schema. The process exits
immediately if a required variable is missing or has an invalid value. Copy
`.env.example` as a starting point — every variable listed there maps 1-to-1
with the table below.

| Variable | Type | Default | Required | Purpose |
|---|---|---|---|---|
| `HOST` | string | `127.0.0.1` | No | Hostname or IP the HTTP server binds to. Set to `0.0.0.0` to accept external connections. |
| `PORT` | integer | `8787` | No | TCP port the HTTP server listens on. |
| `STELLAR_NETWORK` | `testnet` \| `mainnet` | `testnet` | No | Used for display/logging only (reported in `GET /api/health`). |
| `STELLAR_RPC_URL` | URL | `https://soroban-testnet.stellar.org` | No | Soroban JSON-RPC endpoint polled for contract events. |
| `STELLAR_CONTRACT_ID` | string | *(empty)* | **Yes*** | Deployed StellarSettle contract address. When empty the event monitor and all Soroban RPC-backed endpoints are disabled. |
| `START_LEDGER` | integer ≥ 0 | *(unset)* | No | Ledger sequence to start scanning from. When unset, the monitor begins from `latestLedger − 10`. Set this when backfilling a historical range. |
| `POLL_INTERVAL_MS` | integer ≥ 1000 | `5000` | No | Milliseconds between Soroban RPC event polls. Lower values reduce alert latency at the cost of more RPC calls. |
| `DATABASE_PATH` | string | `./data/stellarsettle.sqlite` | No | Path to the SQLite database file. The directory is created automatically. |
| `METADATA_API_KEY` | string | *(empty)* | **Yes*** | Secret key required in the `X-Api-Key` header to write shipment metadata via `PUT /api/metadata/:shipmentId/:key`. When empty, all metadata writes are rejected with `401`. **Never expose this in frontend environment variables.** |
| `WEB_ORIGIN` | URL | `http://localhost:5173` | No | Allowed CORS origin for the frontend. Must match the URL the browser loads the dashboard from. |

> `*` Technically optional at the schema level (the server starts without them)
> but required for full functionality.

---

## API routes

All routes are prefixed with `/api/`. The server returns JSON for every
endpoint except `GET /api/stream` (SSE).

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Returns service status, configured network, event-monitor connection state, and the last scanned ledger. |

**Example response**

```json
{
  "status": "ok",
  "network": "testnet",
  "contractConfigured": true,
  "eventMonitor": "connected",
  "lastScannedLedger": 1234567
}
```

`eventMonitor` values: `"disabled"` (no `STELLAR_CONTRACT_ID`), `"connecting"` (RPC not yet reachable), `"connected"` (polling successfully).

---

### Events

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/events` | None | Returns paginated `dispute_escalated` events stored in the local database. |
| `GET` | `/api/stream` | None | Server-Sent Events (SSE) stream that pushes `dispute_escalated` events in real time. |

**`GET /api/events` query parameters**

| Param | Default | Description |
|---|---|---|
| `after` | `0` | Return only events with a ledger number **greater than** this value. Pass the ledger of the last event you received to page forward. |
| `limit` | `50` | Maximum number of events to return. Capped at `100`. |

**`GET /api/stream`**

Opens a persistent SSE connection. The server sends:
- A `: connected` comment immediately on connect.
- A `: keepalive` comment every 20 seconds.
- `event: dispute_escalated` frames whenever a new escalation is detected.

Each SSE frame carries a JSON payload:

```json
{
  "id": "...",
  "ledger": 1234567,
  "type": "dispute_escalated",
  "shipmentId": "SHIP-001",
  "milestoneIndex": 1,
  "openedLedger": 1234500,
  "currentLedger": 1234567
}
```

---

### Shipments

All shipment routes proxy Soroban RPC calls to the deployed contract. They
return `503 { "error": "contract_not_configured" }` when `STELLAR_CONTRACT_ID`
is not set.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/shipments` | None | List shipment IDs with cursor-based pagination. Proxies the contract's `list_shipments` function. |
| `GET` | `/api/shipments/:id` | None | Retrieve the full `Shipment` struct for a single shipment by its ID. Returns `404` if not found. |
| `GET` | `/api/shipments/:id/milestones` | None | Retrieve all milestones for a shipment, each annotated with their associated on-chain notes. Returns `404` if not found. |

**`GET /api/shipments` query parameters**

| Param | Default | Description |
|---|---|---|
| `after` | `0` | Cursor returned by the previous page (the numeric index into the shipment list). |
| `limit` | `50` | Maximum IDs to return per page. Capped at `100`. |

**`GET /api/shipments` response**

```json
{
  "shipments": ["SHIP-001", "SHIP-002"],
  "nextCursor": 10
}
```

`nextCursor` is `null` when the last page has been reached.

**`GET /api/shipments/:id` response**

Returns the full `Shipment` struct as returned by the contract's `get_shipment`
function (buyer, supplier, logistics, arbiter, token, amounts, milestones,
status, timestamps, dispute configuration, etc.).

**`GET /api/shipments/:id/milestones` response**

```json
{
  "milestones": [
    {
      "name": "Goods Dispatched",
      "payment_percent": 25,
      "proof_hash": "bafybeih...",
      "status": "Confirmed",
      "notes": []
    }
  ]
}
```

---

### Metadata

Off-chain key/value pairs attached to a shipment. Reads are public; writes
require the `X-Api-Key` header matching `METADATA_API_KEY`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/metadata/:shipmentId` | None | Retrieve all metadata entries for a shipment. Returns an empty object `{}` when none exist. |
| `PUT` | `/api/metadata/:shipmentId/:key` | `X-Api-Key` | Store or overwrite a single metadata value. |

**`PUT /api/metadata/:shipmentId/:key`**

- Header: `X-Api-Key: <METADATA_API_KEY>`
- Body: `{ "value": "<string up to 4000 chars>" }`
- Key must match `[a-zA-Z0-9_-]{1,64}`.
- Returns `204 No Content` on success.
- Returns `401` if the key is missing, empty, or mismatched.
- Returns `400` if the shipment ID, key format, or value is invalid.

**`GET /api/metadata/:shipmentId` response**

```json
{
  "po_number": { "value": "PO-2024-7890", "updatedAt": "2024-01-15 10:30:00" },
  "cost_centre": { "value": "CC-APAC-42",  "updatedAt": "2024-01-15 10:31:00" }
}
```

---

## Database

The server uses a local SQLite database (via Node.js built-in `node:sqlite`).
Two tables are created automatically on startup:

| Table | Contents |
|---|---|
| `contract_events` | De-duplicated `dispute_escalated` event records persisted from on-chain polling. |
| `shipment_metadata` | Off-chain key/value metadata written via `PUT /api/metadata/:shipmentId/:key`. |

The database file location is controlled by `DATABASE_PATH`. WAL mode is
enabled for better concurrent read performance.

---

## Architecture notes

- **No transaction signing.** This service is read-only with respect to the
  Soroban contract. All state-changing operations (confirm milestones, submit
  proof, etc.) must be signed by the user's wallet (Freighter) in the frontend.
- **Event monitor.** When `STELLAR_CONTRACT_ID` is set, the service polls
  Soroban RPC every `POLL_INTERVAL_MS` milliseconds, filters for
  `dispute_escalated` contract events, persists new ones, and fans them out to
  all open SSE connections.
- **Backfilling.** Set `START_LEDGER` to a past ledger to recover historical
  events on first run. On subsequent restarts the service resumes from
  `lastScannedLedger + 1`, so no duplicate scanning occurs.
