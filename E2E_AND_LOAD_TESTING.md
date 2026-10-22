# End-to-End and Load Testing

This document covers the full-stack E2E tests (#115) and load tests (#116) for the StellarSettle monorepo.

## End-to-End Testing (#115)

The E2E test suite exercises the complete stack: contract deployment, backend event monitor, and frontend UI.

### Prerequisites

```bash
# Install Soroban CLI
curl --proto '=https' --tlsv1.2 -sSf https://github.com/stellar/rs-soroban-cli/releases/download/v21.0.0/soroban-cli-21.0.0-x86_64-unknown-linux-gnu.tar.gz | tar xz

# Start a local Soroban sandbox
soroban-cli sandbox start
```

### Setup & Running Tests

```bash
# Install E2E test dependencies
npm install --save-dev @playwright/test

# Run the E2E tests
npm run e2e

# Interactive mode (opens Playwright Inspector)
npm run e2e:ui

# Debug mode with more verbose output
npm run e2e:debug

# Run specific test file
npm run e2e -- full-stack.spec.ts

# Generate HTML report after test run
npm run e2e -- --reporter=html
npx playwright show-report
```

### Test Coverage

The test suite (`e2e/tests/full-stack.spec.ts`) covers:

1. **Create Shipment Flow**
   - User creates a new shipment via the frontend form
   - Contract event is emitted on the blockchain
   - Backend's event monitor detects the event
   - Frontend displays the shipment in the list

2. **Confirm Milestone Flow**
   - User confirms a shipment milestone via the frontend
   - Backend detects the confirmation event
   - Frontend updates the milestone status to "confirmed"
   - Completion timestamp is displayed

3. **Multi-Shipment Handling**
   - Multiple concurrent shipments can be created
   - All appear correctly in the UI with proper data
   - Event monitor handles pagination correctly

4. **Event Detection Latency**
   - Measures and reports how long it takes for events to appear in the UI
   - Validates that the event monitor is responsive (target: < 15 seconds end-to-end)

### Configuration

Edit `e2e/playwright.config.ts` to customize:

- **Base URL**: Frontend URL (default: `http://localhost:5173`)
- **Timeout**: Maximum wait time for operations (default: 30s)
- **Retries**: How many times to retry failed tests (default: 0 locally, 2 in CI)
- **Workers**: Parallel test execution (default: 1 in CI, auto locally)
- **Browsers**: Which browsers to test (Chromium, Firefox, WebKit)

### Debugging Failed Tests

```bash
# Run a single test with verbose output
npm run e2e -- --grep "Create shipment"

# Debug with Inspector (pauses test execution)
npm run e2e -- --debug

# View test traces (generated on failure)
npx playwright show-trace trace.zip

# Take screenshots during test
# (Playwright does this automatically on failure)
```

### CI Integration

The E2E tests run in CI via the `orchestrate.yml` workflow:

1. Contracts are built and tested
2. Backend is started
3. Frontend is built and dev server started
4. E2E tests run against the stack
5. Results are reported and HTML report is generated

## Load Testing (#116)

The load test simulates a large backlog of contract events to measure backend event monitor performance.

### Running Load Tests

```bash
# Add script to backend/package.json:
"load-test": "ts-node load-test.ts"

# Run the test
npm --workspace=backend run load-test
```

### What the Load Test Measures

The test simulates:
- **10,000 contract events** in a backlog
- **100-event batches** (pagination size)
- **5ms per RPC call** (getEvents latency)
- **1ms per database write**

And reports:

```
Throughput:
  Event Processing: X events/sec
  Database Writes: Y events/sec

Poll Loop Latency:
  P50: XXms (50th percentile — typical response time)
  P95: XXms (95th percentile — slower operations)
  P99: XXms (99th percentile — rare slowdowns)
```

### Interpreting Results

**Healthy Results:**
- Event processing > 100 events/sec
- P95 latency < 100ms
- P99 latency < 500ms
- Zero errors

**Performance Issues:**
- Event processing < 100 events/sec → File issue: "Event monitor pagination bottleneck"
- P95 latency > 100ms → File issue: "High poll loop latency"
- Database writes < 100 events/sec → File issue: "Database write throughput bottleneck"

### When to Investigate

The load test identifies bottlenecks but does NOT fix them. Instead:

1. Run the test to get baseline metrics
2. If you find a bottleneck, file a follow-up issue with the metrics
3. Investigate the root cause (RPC latency, database I/O, pagination inefficiency)
4. Implement the fix in a separate PR

Example follow-up issue:

```
Title: Event monitor latency spike with large event backlog
Description:
Load test with 10k events shows P95 latency of 250ms.
This indicates the poll loop is blocked by database writes.
Consider: batch optimization, connection pooling, or async writes.
```

### Scaling Behavior

To test different event volumes:

```typescript
// In backend/load-test.ts, adjust:
totalEvents: 100000, // 100k events instead of 10k
batchSize: 1000,     // Larger batches
eventProcessingTimeMs: 10, // Slower RPC
```

Then re-run and compare metrics to see how the monitor scales.

## Continuous Monitoring

In production, monitor these metrics:

- Poll loop latency (should be consistent)
- Database write throughput (should not degrade)
- Event detection lag (time from contract event to UI display)
- Pagination call count (should be proportional to event volume)

Use these as health indicators for the event monitor subsystem.
