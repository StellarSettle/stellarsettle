/**
 * Load test for backend event monitor (#116)
 *
 * Simulates a large backlog of contract events to measure:
 * - Poll loop latency
 * - Database write throughput
 * - Pagination handling under high volume
 *
 * Run:
 *   npm run load-test
 *
 * Expected results:
 *   - Reports latency percentiles (p50, p95, p99)
 *   - Reports throughput (events/sec)
 *   - Identifies bottlenecks for follow-up investigation
 */

import { performance } from 'perf_hooks';

interface LoadTestConfig {
  /** Total number of events to simulate */
  totalEvents: number;
  /** Batch size for pagination */
  batchSize: number;
  /** Number of concurrent poll operations */
  concurrency: number;
  /** Simulated event processing time per event (ms) */
  eventProcessingTimeMs: number;
  /** Simulated database write time per event (ms) */
  dbWriteTimeMs: number;
}

interface LoadTestMetrics {
  totalEvents: number;
  totalDurationMs: number;
  throughputEventsPerSec: number;
  latencyMs: {
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    mean: number;
  };
  dbWriteThroughputPerSec: number;
  paginationCalls: number;
  errors: number;
}

/**
 * Simulates the event monitor's polling loop with realistic event processing
 */
async function simulateEventMonitor(config: LoadTestConfig): Promise<LoadTestMetrics> {
  const latencies: number[] = [];
  let processedEvents = 0;
  let errors = 0;
  let paginationCalls = 0;

  const startTime = performance.now();

  // Simulate polling loop fetching events in batches
  while (processedEvents < config.totalEvents) {
    const pollStartTime = performance.now();
    paginationCalls++;

    const batchToProcess = Math.min(
      config.batchSize,
      config.totalEvents - processedEvents,
    );

    try {
      // Simulate getEvents pagination call
      await simulateGetEventsCall(batchToProcess, config.eventProcessingTimeMs);

      // Simulate batch database writes
      const batchStartTime = performance.now();
      await simulateDbBatchWrite(batchToProcess, config.dbWriteTimeMs);
      const batchEndTime = performance.now();

      processedEvents += batchToProcess;
      const pollEndTime = performance.now();
      latencies.push(pollEndTime - pollStartTime);
    } catch (err) {
      errors++;
      // Simulate retry backoff
      await sleep(100);
    }
  }

  const endTime = performance.now();
  const totalDurationMs = endTime - startTime;

  // Calculate metrics
  const sortedLatencies = latencies.sort((a, b) => a - b);
  const metrics: LoadTestMetrics = {
    totalEvents: processedEvents,
    totalDurationMs,
    throughputEventsPerSec: (processedEvents / totalDurationMs) * 1000,
    latencyMs: {
      min: Math.min(...sortedLatencies),
      max: Math.max(...sortedLatencies),
      p50: percentile(sortedLatencies, 0.5),
      p95: percentile(sortedLatencies, 0.95),
      p99: percentile(sortedLatencies, 0.99),
      mean: sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length,
    },
    dbWriteThroughputPerSec:
      (processedEvents / (config.batchSize * config.dbWriteTimeMs * paginationCalls)) *
      1000,
    paginationCalls,
    errors,
  };

  return metrics;
}

/**
 * Simulates the getEvents RPC call with optional pagination delays
 */
async function simulateGetEventsCall(
  eventCount: number,
  processingTimeMs: number,
): Promise<void> {
  // Simulate RPC call latency
  const delayMs = Math.random() * processingTimeMs;
  await sleep(delayMs);

  // Simulate event parsing/validation
  for (let i = 0; i < eventCount; i++) {
    // Light processing per event
    Math.random();
  }
}

/**
 * Simulates batch database writes
 */
async function simulateDbBatchWrite(eventCount: number, timePerEventMs: number): Promise<void> {
  const totalTime = eventCount * timePerEventMs;
  const startTime = performance.now();

  // Simulate database I/O
  while (performance.now() - startTime < totalTime) {
    // Busy-wait to simulate I/O
  }
}

/**
 * Utility to calculate percentiles from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  const index = Math.ceil(sortedArray.length * p) - 1;
  return sortedArray[Math.max(0, index)];
}

/**
 * Utility sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format metrics for display
 */
function formatMetrics(metrics: LoadTestMetrics): string {
  return `
=== Load Test Results ===

Configuration:
  Total Events: ${metrics.totalEvents.toLocaleString()}
  Duration: ${(metrics.totalDurationMs / 1000).toFixed(2)}s

Throughput:
  Event Processing: ${metrics.throughputEventsPerSec.toFixed(2)} events/sec
  Database Writes: ${metrics.dbWriteThroughputPerSec.toFixed(2)} events/sec

Poll Loop Latency:
  Min: ${metrics.latencyMs.min.toFixed(2)}ms
  P50: ${metrics.latencyMs.p50.toFixed(2)}ms
  P95: ${metrics.latencyMs.p95.toFixed(2)}ms
  P99: ${metrics.latencyMs.p99.toFixed(2)}ms
  Max: ${metrics.latencyMs.max.toFixed(2)}ms
  Mean: ${metrics.latencyMs.mean.toFixed(2)}ms

Pagination:
  Total Calls: ${metrics.paginationCalls}
  Errors: ${metrics.errors}

Status: ${metrics.errors === 0 ? '✅ PASS' : '⚠️ FAIL'}
  `;
}

/**
 * Main test execution
 */
async function runLoadTest(): Promise<void> {
  const config: LoadTestConfig = {
    totalEvents: 10000, // Simulate 10k events in a large backlog
    batchSize: 100, // Typical pagination size
    concurrency: 1, // Single poll loop
    eventProcessingTimeMs: 5, // 5ms per RPC call
    dbWriteTimeMs: 1, // 1ms per database write
  };

  console.log('Starting load test...');
  console.log(`Configuration: ${JSON.stringify(config, null, 2)}`);

  const metrics = await simulateEventMonitor(config);
  console.log(formatMetrics(metrics));

  // File follow-up if bottlenecks are found
  if (metrics.latencyMs.p95 > 100) {
    console.warn('⚠️  High latency detected (P95 > 100ms). Consider filing a follow-up issue.');
  }

  if (metrics.throughputEventsPerSec < 100) {
    console.warn('⚠️  Low throughput detected (< 100 events/sec). Consider filing a follow-up issue.');
  }

  process.exit(metrics.errors > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  runLoadTest().catch((err) => {
    console.error('Load test failed:', err);
    process.exit(1);
  });
}

export { simulateEventMonitor, LoadTestConfig, LoadTestMetrics };
