# StellarSettle Backend

Node.js API and Soroban RPC event monitor for shipment escalation alerts and off-chain shipment metadata.

## Local setup

```sh
cp .env.example .env
npm install
npm run dev
```

Set `STELLAR_CONTRACT_ID` to enable the event monitor. By default, it scans recent contract events on Testnet and persists `dispute_escalated` alerts and metadata in a local SQLite database. The API exposes `GET /api/health`, `GET /api/events`, `GET /api/stream` (SSE), shipment endpoints, and metadata read/write endpoints. Metadata writes are disabled until a non-empty `METADATA_API_KEY` is configured; keep that key on the server and never expose it in frontend variables.

The event monitor starts from the latest ledger minus ten when `START_LEDGER` is unset. Configure a ledger explicitly when recovering an older range. This service does not sign or submit contract transactions; the connected wallet remains responsible for user-authorized actions.

```sh
npm run typecheck
npm run build
npm start
```

## API Endpoints

### Health & Events

- **GET /api/health** — Check service status, network, and event monitor state
- **GET /api/events** — Retrieve paginated `dispute_escalated` events (query params: `after` ledger, `limit` max 100)
- **GET /api/stream** — Server-Sent Events stream of new disputes (SSE)

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