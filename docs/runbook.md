# On-Call Runbook

Operational runbook for common on-call scenarios. Each scenario lists symptoms,
impact, and step-by-step resolution. Escalate to the on-call lead if a scenario
is not resolved within its stated target time.

---

## 1. Stuck Shipment (all milestones stalled)

**Symptoms**
- A shipment shows no milestone progress for longer than the expected SLA.
- All milestones remain in a pending/in-progress state with no new events.
- No contract events are being emitted for the shipment.

**Impact**
- Shippers and carriers cannot advance the shipment; downstream notifications stop.

**Resolution steps**
1. Identify the shipment ID and its current milestone states from the admin dashboard or DB.
2. Check the backend logs for the shipment ID to confirm whether milestone updates are being received and processed.
3. Verify the RPC connection is healthy (see Scenario 2). A dropped RPC connection is the most common cause of stalled milestones.
4. Confirm the expected contract events for the shipment exist on-chain (see Scenario 3). If events are missing, the shipment cannot progress until they are replayed.
5. If events exist on-chain but the backend has not processed them, re-trigger event ingestion/replay for the affected ledger range.
6. If the shipment is genuinely blocked on an external party (e.g. awaiting carrier action), document the reason and notify the shipment owner rather than forcing state.
7. Once resolved, verify the shipment advances through the next milestone and confirm notifications resume.

**Target:** resolve or escalate within 30 minutes.

---

## 2. Backend Loses RPC Connection

**Symptoms**
- Backend logs show connection errors, timeouts, or `ECONNREFUSED`/`ECONNRESET` to the RPC endpoint.
- Health checks report the RPC dependency as unhealthy.
- No new on-chain events are ingested; shipments begin to stall.

**Impact**
- Event ingestion and on-chain reads/writes fail; the system falls behind the ledger.

**Resolution steps**
1. Confirm the failure is RPC-related by checking backend logs and the health endpoint.
2. Verify the configured RPC endpoint URL and credentials are correct and unchanged.
3. Check the RPC provider status page for outages or rate limiting.
4. If the provider is down or rate-limiting, fail over to a backup RPC endpoint via configuration and restart/reload the backend.
5. Confirm connectivity is restored (health check green, logs show successful requests).
6. Determine the last successfully processed ledger; events missed during the outage must be replayed (see Scenario 3).
7. Monitor ingestion until the backend catches up to the current ledger.

**Target:** restore connectivity within 15 minutes; replay backlog promptly after.

---

## 3. Contract Event Gaps (missed ledger range)

**Symptoms**
- A gap exists between the last processed ledger and the current ledger.
- Shipments or records are missing expected state changes.
- Event ingestion logs show skipped or unprocessed ledger ranges.

**Impact**
- State is inconsistent with on-chain truth; shipments may appear stuck or incorrect.

**Resolution steps**
1. Identify the exact missed ledger range: compare the last processed ledger in the backend against the current ledger.
2. Confirm the events for that range exist on-chain (query the contract or an explorer).
3. Replay/backfill the missed ledger range through the event ingestion process.
4. Verify each replayed event was applied exactly once (idempotency) and no duplicates were introduced.
5. Re-check affected shipments to confirm their state now matches on-chain events.
6. If replay fails, capture the failing ledger range and escalate to the on-call lead with logs.
7. Add a note to the incident record documenting the missed range and root cause.

**Target:** identify the gap within 15 minutes; complete replay within 1 hour.

---

## 4. Emergency Admin Succession

**Symptoms**
- The current admin key is lost, compromised, or unavailable.
- Admin-only operations (e.g. contract configuration, role changes) cannot be performed.

**Impact**
- Critical administrative actions are blocked; security risk if the key is compromised.

**Resolution steps**
1. Confirm the nature of the incident: lost key vs. suspected compromise. Treat suspected compromise as a security incident and notify the security lead immediately.
2. If compromised, revoke/rotate the affected credentials and pause sensitive admin operations where supported.
3. Identify the designated successor admin per the access-control policy and verify their authorization.
4. Execute the admin succession procedure (transfer admin role to the successor) using the approved multi-step process; require a second approver.
5. Verify the successor can perform admin operations and that the old admin no longer has privileges.
6. Update the secrets store and access records to reflect the new admin.
7. Document the incident, timeline, and approvals in the incident record.

**Target:** contain a compromise immediately; complete succession within 1 hour.

---

## Escalation

- If a scenario is not resolved within its target time, escalate to the on-call lead.
- For security incidents (compromised keys), notify the security lead immediately and in parallel.
- Always record the incident timeline, actions taken, and root cause for post-incident review.
