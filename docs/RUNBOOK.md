# Event Monitor Operations Runbook

## Overview

This runbook provides procedures for diagnosing and recovering from common event monitor failures in production. The event monitor's health is exposed via the `/api/health` endpoint.

## Health Check Endpoint

**GET /api/health** returns:
```json
{
  "status": "healthy|unhealthy",
  "rpcHealthy": true|false,
  "lastScannedLedger": 12345678,
  "ledgerAge": 30,
  "uptime": 3600
}
```

**Key Fields:**
- `rpcHealthy`: RPC connection status (false = network issue or RPC down)
- `lastScannedLedger`: Most recent ledger scanned (indicates progress)
- `ledgerAge`: Seconds since last scanned ledger (normal: 0-30 seconds)
- `status`: Derived from above fields

---

## Scenario 1: rpcHealthy = false

**Symptoms:** `/api/health` shows `rpcHealthy: false`

**Diagnosis:**
1. Check RPC endpoint connectivity:
   ```bash
   curl -s https://<RPC_ENDPOINT>/health | jq .
   ```
2. Verify `STELLAR_RPC_URL` environment variable is set correctly
3. Check firewall/proxy rules allow outbound HTTPS to RPC endpoint
4. Verify RPC endpoint has capacity (check RPC provider's status page)

**Recovery:**
1. If RPC is down: Wait for RPC provider to recover, monitor will auto-reconnect
2. If RPC URL is wrong: Update `STELLAR_RPC_URL`, restart monitor:
   ```bash
   systemctl restart stellarsettle-monitor
   ```
3. If network blocked: Fix firewall/proxy rules, restart
4. If RPC throttling: Reduce polling frequency (check `LEDGER_POLL_INTERVAL_MS`)

---

## Scenario 2: lastScannedLedger Stuck (Not Advancing)

**Symptoms:** 
- `/api/health` shows `ledgerAge > 60` seconds
- `lastScannedLedger` unchanged for 5+ minutes

**Diagnosis:**
1. Check monitor logs for errors:
   ```bash
   journalctl -u stellarsettle-monitor -n 50
   ```
2. Verify event processing queue is not full:
   ```bash
   redis-cli LLEN event:queue
   ```
3. Check database connection status:
   ```bash
   psql -c "SELECT 1;" || echo "DB DOWN"
   ```
4. Verify disk space on data partition:
   ```bash
   df -h /var/data
   ```

**Recovery:**
- If queue full: Restart backend to flush queue:
  ```bash
  systemctl restart stellarsettle-backend
  ```
- If database down: Restore from backup, restart monitor
- If disk full: Free space (archive old events), restart monitor
- If logs show parsing errors: Update Stellar SDK, restart

---

## Scenario 3: High ledgerAge (Monitor Lagging Behind)

**Symptoms:**
- `ledgerAge` > 120 seconds
- `lastScannedLedger` advancing but slower than network rate

**Diagnosis:**
1. Check backend processing latency:
   ```bash
   curl -s http://localhost:3001/api/health | jq .processingTimeMs
   ```
2. Monitor CPU/memory usage:
   ```bash
   top -u stellarsettle
   ```
3. Check database query performance:
   ```bash
   SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC;
   ```

**Recovery:**
- If CPU maxed: Increase polling interval `LEDGER_POLL_INTERVAL_MS` (e.g., 2000 → 5000)
- If memory growing: Restart monitor (check for memory leaks)
- If DB slow: Optimize queries (add indexes, analyze tables)
- If network slow: Increase RPC timeout `RPC_TIMEOUT_MS`

---

## Quick Health Checks

Run this script to diagnose monitor health:

```bash
#!/bin/bash
echo "=== Event Monitor Health Check ==="

# 1. API Health
echo "1. API Health:"
curl -s http://localhost:3000/api/health | jq .

# 2. RPC Connection
echo "2. RPC Connection:"
curl -s ${STELLAR_RPC_URL}/health | jq .

# 3. Database
echo "3. Database:"
psql -c "SELECT COUNT(*) FROM events;" || echo "ERROR"

# 4. Event Queue
echo "4. Event Queue Depth:"
redis-cli LLEN event:queue

# 5. System Resources
echo "5. System Resources:"
top -b -n1 -u stellarsettle | head -5
```

---

## Recovery Procedures

### Full Monitor Restart
```bash
systemctl stop stellarsettle-monitor
systemctl stop stellarsettle-backend
# Wait for clean shutdown (30s)
systemctl start stellarsettle-backend
systemctl start stellarsettle-monitor
```

### Reset to Latest Ledger
If monitor is irreparably behind, reset to latest network ledger:
```bash
# 1. Stop monitor
systemctl stop stellarsettle-monitor

# 2. Reset ledger pointer
redis-cli DEL lastScannedLedger

# 3. Start monitor (will scan from tip)
systemctl start stellarsettle-monitor
```

### Escalation
If above steps don't resolve:
1. Check `/api/health` again after 5 minutes
2. Review logs for specific error messages
3. Contact Stellar support if RPC issues persist
