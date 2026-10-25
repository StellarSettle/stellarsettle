# Security & Threat Model

StellarSettle is a distributed escrow system spanning smart contracts, backend API, and frontend dashboard. This document covers the threat model and mitigations across all three layers.

## Smart Contract Threats & Mitigations

### Re-entrancy

**Threat**: Malicious contract calls back into StellarSettle during execution, draining escrow funds.

**Mitigations**:
- Checks-effects-interactions pattern: validate conditions, update state, then make external calls
- No recursive calls to untrusted contracts during fund transfers

### Integer Overflow/Underflow

**Threat**: Calculation errors in fee computation or payment distribution leak or lose funds.

**Mitigations**:
- Rust's `u128` and checked arithmetic with panic guards
- Unit tests validate edge cases (zero fees, maximum values)

### Access Control

**Threat**: Non-arbiter accounts confirm milestones or release funds.

**Mitigations**:
- Each function explicitly checks `require_auth(&arbiter)` or similar
- Contract state immutably tracks the arbiter address
- Tests verify unauthorized calls are rejected

### State Machine Violation

**Threat**: Transition shipment directly from Created to Settled, bypassing In-Transit and Delivered milestones.

**Mitigations**:
- State enum with exhaustive pattern matching
- Functions only accept transitions from valid previous states
- Tests verify invalid transitions are rejected

---

## Backend API Threats & Mitigations (#124)

### Authentication & Authorization

**Threat**: Unauthenticated users access other users' shipments or trigger operations.

**Mitigations**:
- API key or JWT token required for all endpoints
- User ID extracted from token; endpoints only return/modify shipments owned by that user
- Token rotation on login; short expiration (1 hour default)
- Tests verify unauthenticated requests are rejected (401)
- Tests verify cross-user access is blocked (403)

Example protected endpoint:
```typescript
app.get('/api/shipments/:id', authenticateToken, (req, res) => {
  const shipment = db.find(req.params.id);
  if (shipment.ownerId !== req.user.id) return res.status(403).send('Forbidden');
  res.json(shipment);
});
```

### Rate Limiting

**Threat**: DDoS attacks or runaway clients exhaust RPC quota or database connections.

**Mitigations**:
- Per-user rate limit: 100 requests/minute
- Per-IP rate limit: 1000 requests/minute
- Sliding window counter (not token bucket)
- Rate limit headers in responses: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- Automated alerts if limit exceeded 10x in 5 minutes

### Event Monitor Reliability

**Threat**: Backend falls out of sync with contract (missing events, duplicate processing).

**Mitigations**:
- Event polling with cursor/pagination: fetch only new events
- Idempotent event processing: re-processing same event is safe
- Database transaction per event: all-or-nothing semantics
- Health check endpoint returns last synced block and lag
- Alerts if lag > 10 blocks (5+ minutes)

### Input Validation

**Threat**: Invalid shipment data causes crashes or database corruption.

**Mitigations**:
- Strict schema validation (Zod or similar)
- Origin/destination: non-empty strings, max 256 chars
- Value: positive integer, max 2^63-1 (database INT64 limit)
- Cargo: non-empty string, max 512 chars
- Arbiter address: valid Stellar account (StrKey validation)
- Tests verify invalid inputs are rejected (400)

### Sensitive Data Exposure

**Threat**: Logs or error messages leak arbiter private keys, payment amounts, or user PII.

**Mitigations**:
- Never log private keys, seeds, or tokens
- Error responses don't reveal database schema or internal details
- Logs sanitized: `[REDACTED]` for sensitive fields
- Database backups encrypted at rest
- Access logs rotated after 30 days

---

## Frontend Dashboard Threats & Mitigations (#124)

### Cross-Site Scripting (XSS)

**Threat**: Attacker injects malicious JavaScript via shipment data (cargo field), stealing user tokens or sending unauthorized transactions.

**Mitigations**:
- React auto-escapes JSX by default: `<span>{shipment.cargo}</span>` is safe
- User input sanitized with `DOMPurify` before storage
- Content Security Policy (CSP) header:
  ```
  Content-Security-Policy: 
    default-src 'self'; 
    script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; 
    img-src 'self' data:
  ```
- Tests verify cargo field with `<script>alert('xss')</script>` is escaped in HTML

### Wallet Interaction Risks

**Threat**: Malicious dapp approves unauthorized transactions via the wallet (e.g., signing a shipment with inflated value or wrong arbiter).

**Mitigations**:
- User reviews transaction details before wallet approval
- Frontend displays arbiter address, value, and cargo in clear format
- Wallet extension (Freighter, etc.) shows transaction summary
- No auto-approval: every transaction requires explicit user signature
- Tests verify transaction details match form input

Example wallet interaction:
```typescript
const response = await wallet.signTransaction(txXdr, {
  networkPassphrase: 'Test SDF Network ; September 2015',
});
// User sees in wallet: "Sign transaction for StellarSettle: create shipment with value $50,000"
```

### Session Token Theft

**Threat**: Attacker steals JWT token from localStorage via XSS or network sniffing.

**Mitigations**:
- Token stored in secure HttpOnly cookie (not localStorage)
- Cookie marked `Secure` (HTTPS only) and `SameSite=Strict`
- Token expires after 1 hour; refresh token for longer sessions
- HTTPS enforced via HSTS header

### State Desynchronization

**Threat**: Frontend and backend have conflicting shipment state (e.g., frontend thinks delivery confirmed, backend hasn't indexed the event yet).

**Mitigations**:
- WebSocket or SSE for real-time updates from backend
- Optimistic updates with rollback: UI updates immediately, reverts if server rejects
- Polling fallback (every 5 seconds) for state confirmation
- Conflict resolution: server state is authoritative; client refreshes on mismatch

---

## Known Limitations

### Contract Limitations
- **Single arbiter**: Only one arbiter per contract deployment. Multi-sig arbiter would require contract upgrade.
- **No dispute resolution**: Disputed milestones are flagged but not automatically resolved. Requires manual arbiter review.
- **Fixed fee structure**: Fees are configured at deployment and cannot be changed after.

### Backend Limitations
- **Event polling latency**: Events appear in UI 5-15 seconds after contract event due to RPC polling interval and indexing.
- **No offline support**: Backend requires live RPC connection; network outages cause gaps in monitoring.
- **Rate limiting is per-user, not per-wallet-address**: A user with multiple wallets shares one rate limit.

### Frontend Limitations
- **No offline mode**: Dashboard requires backend connectivity; no cached view.
- **Wallet dependencies**: Users must have a compatible wallet extension (Freighter, Ledger, etc.).
- **Browser-based signatures**: Private keys never leave the wallet extension, but extension security is wallet-provider's responsibility.

---

## Deployment Security Checklist

Before deploying to mainnet:

### Contracts
- [ ] All unit tests pass
- [ ] Load test shows no panics or overflows
- [ ] Code reviewed by two maintainers
- [ ] Audit report from external security firm

### Backend
- [ ] API key rotation deployed
- [ ] Rate limiting configured and tested
- [ ] Database encryption enabled
- [ ] Logs configured with redaction
- [ ] Health check endpoint tested
- [ ] Error monitoring (Sentry, DataDog) configured

### Frontend
- [ ] CSP header tested in production
- [ ] XSS payload tests pass
- [ ] HTTPS enforced
- [ ] HSTS header configured
- [ ] Wallet integration tested with real Freighter
- [ ] Production API endpoint verified

### Ongoing
- [ ] Automated dependency updates (Dependabot)
- [ ] Security headers monitored
- [ ] Rate limit alerts configured
- [ ] Event monitor lag monitored
- [ ] Error rates monitored

---

## Reporting Security Issues

Found a vulnerability? Please **do not file a public GitHub issue**. Instead:

1. Email `security@stellarsettle.example` with:
   - Vulnerability description
   - Steps to reproduce
   - Affected component (contract/backend/frontend)
   - Proposed fix (if any)

2. We will respond within 48 hours
3. We will provide a timeline for patching
4. Once patched, we'll credit you (if desired)

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) for web application risks
- [Soroban Security Best Practices](https://developers.stellar.org/docs/learn/security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/) for software weaknesses
