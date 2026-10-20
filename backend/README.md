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

## API Documentation

An interactive Swagger UI is available at **`/api/docs`** when the server is running. The OpenAPI 3.x spec is served at `/api/docs/json`.

## Rate Limiting

All public read endpoints are rate-limited to prevent RPC quota exhaustion or database flooding. Authenticated metadata write endpoints have a separate (higher) limit.

| Variable | Default | Description |
|---|---|---|
| `RATE_LIMIT_READ_MAX` | `100` | Max requests per window for anonymous read routes |
| `RATE_LIMIT_WRITE_MAX` | `30` | Max requests per window for authenticated write routes |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window in milliseconds (default: 1 minute) |

When a limit is exceeded the server returns **HTTP 429** with a `Retry-After` header indicating when the client may retry.

## API Endpoints

### Health & Events

- **GET /api/health** — Check service status, network, and event monitor state
- **GET /api/events** — Retrieve paginated contract events (query params: `after` ledger, `limit` max 100)
- **GET /api/stream** — Server-Sent Events stream of new `dispute_escalated` events (SSE)

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

### Shipments

- **GET /api/shipments** — List shipment IDs with pagination (query params: `after` cursor, `limit` max 100)
  - Returns: `{ shipments: string[], nextCursor?: number }`
  
- **GET /api/shipments/:id** — Retrieve full shipment details
  - Response: Full `Shipment` struct (all 51+ fields)
  - Returns 404 if shipment ID not found
  
- **GET /api/shipments/:id/milestones** — List all milestones for a shipment with notes
  - Response: `{ milestones: Array<Milestone & { notes: MilestoneNote[] }> }`
  - Returns 404 if shipment ID not found

### Metadata

- **GET /api/metadata/:shipmentId** — Retrieve all metadata for a shipment
  - Returns: `{ [key: string]: { value: string, updatedAt: string } }`

- **PUT /api/metadata/:shipmentId/:key** — Store off-chain metadata (requires `X-API-Key` header)
  - Body: `{ value: string }`
  - Returns 401 if `METADATA_API_KEY` not configured or mismatched
  - Returns 400 if value exceeds 4000 characters