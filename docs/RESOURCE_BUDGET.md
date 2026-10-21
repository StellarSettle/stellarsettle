# StellarSettle — Per-Function Resource Budget

> **Contract:** `contracts/stellarsettle` (v0.1.0)  
> **Companion contract:** `contracts/loan_manager`  
> **Soroban mainnet limits:** 100 000 000 CPU instructions, 40 MB memory per transaction  
> **Benchmark harness:** `contracts/stellarsettle/src/benchmarks.rs`

---

## Table of Contents

1. [Overview](#1-overview)
2. [How to Read This Document](#2-how-to-read-this-document)
3. [Soroban Resource Limits Reference](#3-soroban-resource-limits-reference)
4. [Top 25 Functions by Expected Call Frequency](#4-top-25-functions-by-expected-call-frequency)
   - [Tier 1 — Core Shipment Lifecycle (very high frequency)](#tier-1--core-shipment-lifecycle-very-high-frequency)
   - [Tier 2 — Dispute & Resolution (high frequency)](#tier-2--dispute--resolution-high-frequency)
   - [Tier 3 — Read-Only Queries (high frequency, read-only)](#tier-3--read-only-queries-high-frequency-read-only)
   - [Tier 4 — Advance Payments & Payouts (medium frequency)](#tier-4--advance-payments--payouts-medium-frequency)
   - [Tier 5 — Maintenance & Admin (low-medium frequency)](#tier-5--maintenance--admin-low-medium-frequency)
5. [loan_manager Top Functions](#5-loan_manager-top-functions)
6. [Cost Scaling Rules](#6-cost-scaling-rules)
7. [Integrator Guidelines](#7-integrator-guidelines)
8. [Regenerating Measurements](#8-regenerating-measurements)
9. [Regression Guard](#9-regression-guard)

---

## 1. Overview

With nearly 390 public entry points across `stellarsettle` and `loan_manager`, not every function carries the same resource footprint. This document gives integrators a consolidated reference for the **CPU instruction cost** and **storage access patterns** of the most frequently called functions, so they can:

- Anticipate transaction fees before signing.
- Batch or sequence calls to stay within per-transaction limits.
- Design keeper / cron workflows around the heaviest operations.
- Detect regressions after a contract upgrade.

Resource figures are derived from the benchmark harness in `contracts/stellarsettle/src/benchmarks.rs` using Soroban's `env.cost_estimate().budget().cpu_instruction_cost()` API. Since Cargo is required to produce live numbers, the table below also documents the **complexity class** of each function so you can reason about costs even without running benchmarks.

---

## 2. How to Read This Document

Each table row lists:

| Column | Meaning |
|---|---|
| **Function** | Exact entry-point name as it appears in the contract ABI |
| **Role** | Who may call it (B = Buyer, S = Supplier, A = Arbiter, Admin, Anyone) |
| **Storage ops** | Approximate number of persistent-storage reads (`R`) and writes (`W`) in the hot path |
| **Token transfers** | Number of SAC `transfer` calls issued (each adds ~3–5 M instructions) |
| **Complexity** | `O(1)` = constant cost; `O(m)` = linear in milestone count; `O(s)` = linear in shipment list size |
| **Relative cost** | 🟢 Low · 🟡 Medium · 🔴 High |
| **Measured (1 ms / 10 ms)** | CPU instructions at 1-milestone and 10-milestone shipments from the benchmark harness (`—` = not benchmarked directly; estimate based on storage model) |

**Instruction budget rule of thumb:**

| Relative cost | Approximate instructions | % of mainnet limit |
|---|---|---|
| 🟢 Low | < 5 M | < 5% |
| 🟡 Medium | 5 M – 25 M | 5–25% |
| 🔴 High | > 25 M | > 25% |

---

## 3. Soroban Resource Limits Reference

| Resource | Per-transaction limit |
|---|---|
| CPU instructions | 100 000 000 (100 M) |
| Memory | 40 MB |
| Ledger entry reads | 40 |
| Ledger entry writes | 25 |
| Events | 3 000 bytes |
| Transaction size | 70 KB |

Every `stellar contract invoke` call executes in a single transaction that must stay within all of these limits simultaneously. CPU instructions and ledger entry write counts are the most likely bottlenecks for complex StellarSettle operations.

> **Tip:** Simulate transactions with `stellar contract invoke --fee-stats` on testnet before submitting to mainnet. The returned `cost_estimate` shows actual instruction usage.

---

## 4. Top 25 Functions by Expected Call Frequency

### Tier 1 — Core Shipment Lifecycle (very high frequency)

These functions execute on every shipment and form the critical path for all participants.

| Function | Role | Storage ops | Token transfers | Complexity | Relative cost | Measured (1 ms / 10 ms) |
|---|---|---|---|---|---|---|
| `create_shipment` | B | R×5 + W×(4+m) | 1 (escrow lock) | O(m) | 🔴 High | see §8 |
| `submit_proof` | S / Logistics | R×3 + W×2 | 0 | O(1) | 🟡 Medium | see §8 |
| `confirm_milestone` | B | R×6 + W×4 | 1–2 (payout + optional fee) | O(1) | 🔴 High | see §8 |
| `batch_confirm_milestones` | B | R×(3+k) + W×(3+k) | k (one per milestone) | O(k) | 🔴 High | — |
| `cancel_shipment` | B | R×4 + W×3 | 1 (refund) | O(1) | 🟡 Medium | see §8 |

**Notes:**

- `create_shipment` is the most expensive call in a normal lifecycle. It validates milestone percentages, performs an allowlist check, writes the shipment record plus per-milestone data, updates the shipment index for the buyer and supplier, and locks USDC via a SAC transfer. Cost scales linearly with milestone count (`m`) because each milestone is written as a separate ledger entry.
- `confirm_milestone` reads the full shipment record plus the fee config, writes back the updated shipment with the new milestone status and `released_amount`, updates `TotalEscrowed`, and issues a SAC transfer to the supplier (and optionally a platform-fee transfer to the treasury). The last milestone that completes a shipment adds reputation counters, increasing the write count by 1.
- `batch_confirm_milestones(k)` is equivalent to `k` individual `confirm_milestone` calls in one transaction. Use it when multiple proofs are ready to save round-trip overhead, but watch the ledger-write limit (25 per tx) — batches of more than ~6 milestones may approach it.

---

### Tier 2 — Dispute & Resolution (high frequency)

Dispute functions carry extra overhead because they update dispute indices and may also perform token transfers at resolution time.

| Function | Role | Storage ops | Token transfers | Complexity | Relative cost | Measured (1 ms / 10 ms) |
|---|---|---|---|---|---|---|
| `raise_dispute` | B | R×5 + W×4 | 0 (funds stay in escrow) | O(1) | 🟡 Medium | see §8 |
| `raise_partial_dispute` | B | R×5 + W×5 | 1 (uncontested release) | O(1) | 🔴 High | — |
| `resolve_dispute` | A | R×6 + W×5 | 1–2 (payout or refund + optional fee) | O(1) | 🔴 High | see §8 |
| `resolve_dispute_timeout` | Anyone | R×5 + W×4 | 1–2 | O(1) | 🔴 High | — |
| `withdraw_dispute` | B | R×4 + W×3 | 0 | O(1) | 🟡 Medium | — |
| `submit_dispute_evidence` | B / S / Logistics | R×2 + W×1 | 0 | O(1) | 🟢 Low | — |
| `check_escalation` | Anyone | R×3 + W×0 | 0 | O(1) | 🟢 Low | — |

**Notes:**

- `raise_partial_dispute` is more expensive than `raise_dispute` because it computes the uncontested split and issues an immediate token transfer to the supplier in the same call.
- `resolve_dispute_timeout` is permissionless — any bot or keeper can submit it once the timeout window (`dispute_timeout_seconds`) has elapsed. Its cost mirrors `resolve_dispute`.
- `submit_dispute_evidence` is deliberately cheap (one append-only write); call it as often as needed during a dispute.

---

### Tier 3 — Read-Only Queries (high frequency, read-only)

Read-only functions do not consume write quota and do not pay token transfer costs. They are the cheapest way to observe contract state off-chain but still consume CPU instructions and read quota.

| Function | Role | Storage ops | Token transfers | Complexity | Relative cost | Notes |
|---|---|---|---|---|---|---|
| `get_shipment` | Anyone | R×(3+m) | 0 | O(m) | 🟡 Medium | Loads full shipment + milestones |
| `get_shipment_summary` | Anyone | R×2 | 0 | O(1) | 🟢 Low | Lightweight alternative to `get_shipment` |
| `get_shipment_summaries` | Anyone | R×(2×n) | 0 | O(n) | 🟡 Medium | Batch; capped at `get_max_summary_batch()` (default 50) |
| `get_milestone` | Anyone | R×2 | 0 | O(1) | 🟢 Low | Single milestone entry |
| `get_escrow_balance` | Anyone | R×1 | 0 | O(1) | 🟢 Low | Single field read |
| `get_completion_percentage` | Anyone | R×1 | 0 | O(1) | 🟢 Low | Single field read |
| `get_reputation` | Anyone | R×1 | 0 | O(1) | 🟢 Low | Returns cached counters |
| `get_contract_stats` | Anyone | R×4 | 0 | O(1) | 🟢 Low | Four aggregate counters |
| `list_shipments` | Anyone | R×(limit+2) | 0 | O(limit) | 🟡 Medium | Page capped at 50; use cursor pagination |
| `get_shipments_by_supplier` | Anyone | R×2 | 0 | O(1) | 🟢 Low | Returns pre-built index; no scan |
| `get_shipments_by_buyer` | Anyone | R×2 | 0 | O(1) | 🟢 Low | Returns pre-built index; no scan |
| `get_shipment_risk` | Anyone | R×(2+m) | 0 | O(m) | 🟡 Medium | Iterates milestones for deadline check |
| `estimate_shipment_costs` | Anyone | R×3 | 0 | O(m) | 🟡 Medium | Simulation only — no auth needed |

**Notes:**

- Prefer `get_shipment_summary` over `get_shipment` for dashboards that only need status, amounts, and party addresses. It reads 2 ledger entries vs. `3 + m` for a full shipment record.
- `list_shipments` with `status_filter` loads shipment records to check status, making it `O(page_size)` in ledger reads. For large deployments, consider filtering by status at the application layer using cached IDs.
- `estimate_shipment_costs` is a simulation helper that runs the full fee logic (including VIP waivers, fee holidays, tier discounts, and splits) without writing anything. Call it on-chain via a dry-run simulation before `create_shipment`.

---

### Tier 4 — Advance Payments & Payouts (medium frequency)

| Function | Role | Storage ops | Token transfers | Complexity | Relative cost | Measured |
|---|---|---|---|---|---|---|
| `request_advance` | S | R×3 + W×2 | 0 | O(1) | 🟡 Medium | — |
| `approve_advance` | B | R×4 + W×3 | 1 (advance payout) | O(1) | 🔴 High | — |
| `claim_payout` | S | R×2 + W×1 | 1 | O(1) | 🟡 Medium | — |
| `top_up_escrow` | B | R×2 + W×2 | 1 | O(1) | 🟡 Medium | — |

**Notes:**

- `approve_advance` issues a token transfer immediately (escrowed funds → supplier) and updates `TotalEscrowed`, making it as expensive as a milestone confirmation.
- `claim_payout` (batched-mode withdrawal) is cheap relative to `approve_advance`: one SAC transfer and two storage ops. The conversion path (if `set_payout_currency_preference` is active) adds one extra storage read but no additional transfer overhead.

---

### Tier 5 — Maintenance & Admin (low-medium frequency)

| Function | Role | Storage ops | Token transfers | Complexity | Relative cost | Notes |
|---|---|---|---|---|---|---|
| `extend_shipment_ttl` | Anyone | R×1 + W×(4+m) | 0 | O(m) | 🟡 Medium | Bumps TTL on all persistent keys for a shipment |
| `claim_auto_confirmation` | Anyone | R×6 + W×4 | 1–2 | O(1) | 🔴 High | Same cost as `confirm_milestone` |
| `claim_deadline_refund` | B | R×5 + W×4 | 1 (refund) | O(1) | 🔴 High | — |
| `get_circuit_breaker` | Anyone | R×1 | 0 | O(1) | 🟢 Low | — |
| `pause` / `unpause` | Admin | R×1 + W×1 | 0 | O(1) | 🟢 Low | — |
| `emergency_recover` | Admin | R×3 + W×3 | 1 | O(1) | 🔴 High | Only callable after `RECOVERY_THRESHOLD_LEDGERS` (~2 years) |

**Notes:**

- `extend_shipment_ttl` is permissionless. Keeper bots should call it on a schedule (e.g. every 3–6 months) for long-running shipments. Cost is `O(m)` because every per-milestone storage key must be TTL-bumped individually.
- `claim_auto_confirmation` runs the complete payout path (fee deduction, SAC transfer, shipment status update) and is therefore as expensive as a regular `confirm_milestone`.

---

## 5. loan_manager Top Functions

The `loan_manager` contract implements a Soroban lending pool. Its most commonly called functions are listed below.

| Function | Role | Storage ops | Token transfers | Complexity | Relative cost |
|---|---|---|---|---|---|
| `deposit` | Depositor | R×3 + W×3 | 1 | O(1) | 🟡 Medium |
| `withdraw` | Depositor | R×3 + W×2 | 1 | O(1) | 🟡 Medium |
| `deposit_collateral` | Borrower | R×2 + W×2 | 1 | O(1) | 🟡 Medium |
| `borrow` | Borrower | R×4 + W×3 | 1 | O(1) | 🔴 High |
| `repay` | Borrower | R×3 + W×2 | 1 | O(1) | 🟡 Medium |
| `withdraw_collateral` | Borrower | R×4 + W×2 | 1 | O(1) | 🔴 High |
| `liquidate` | Liquidator | R×5 + W×4 | 2 | O(depositors) | 🔴 High |
| `health_factor` | Anyone | R×3 | 0 | O(1) | 🟡 Medium |
| `get_position` | Anyone | R×1 | 0 | O(1) | 🟢 Low |
| `get_pool_info` | Anyone | R×2 | 0 | O(1) | 🟢 Low |
| `preview_price` | Anyone | R×3 | 0 | O(1) | 🟢 Low |

**Notes:**

- `liquidate` is the most expensive operation because it consults the oracle failover chain (primary → secondary → 30-minute TWAP), computes the dynamic liquidation bonus, and may socialize bad debt across all depositors (`O(depositors)` writes). On a pool with many depositors this can approach the write limit.
- `borrow` and `withdraw_collateral` both invoke `resolve_price` which follows the same oracle failover chain.

---

## 6. Cost Scaling Rules

Understanding how costs scale with inputs lets integrators estimate fees without running benchmarks every time.

### 6.1 Milestone count (`m`)

Functions that iterate over milestones scale as `O(m)`:

- `create_shipment` — writes one storage entry per milestone; each entry is a separate Soroban ledger key.
- `batch_confirm_milestones(k)` — issues one SAC transfer per confirmed milestone. At `k=6` on a fee-enabled deployment: 6 payout transfers + potentially 6 treasury transfers = 12 SAC calls, consuming significant CPU budget.
- `extend_shipment_ttl` — bumps TTL on the shipment root key plus every per-milestone key. A 10-milestone shipment touches ≥12 ledger entries.
- `get_shipment` — reads the shipment root plus individual milestone entries.

### 6.2 Fees and SAC transfers

Each `token.transfer()` (SAC call) adds approximately 3–5 million CPU instructions, depending on the number of signers involved. Functions that issue multiple transfers (e.g. payout + platform fee + logistics fee + referral fee) multiply this overhead. The `FeeConfig` and fee-tier settings are read on every payout function:

```
confirm_milestone with fee configured:
  payout transfer       → ~4 M instructions
  platform fee transfer → ~4 M instructions
  logistics fee (if set)→ ~4 M instructions
  ─────────────────────────────────────────
  SAC cost alone        → ~8–12 M instructions
```

### 6.3 Storage write count

Soroban enforces a **25 ledger-entry-write limit per transaction**. Operations that write many keys can silently fail this limit before the CPU budget is exhausted:

| Operation | Approximate writes |
|---|---|
| `create_shipment` (m milestones) | 4 + m + 2 (indices) |
| `batch_confirm_milestones` (k milestones) | 2 + k (shipment + k milestone states) |
| `extend_shipment_ttl` (m milestones) | 2 + m (TTL bumps count as writes) |
| `liquidate` with bad-debt socialization (d depositors) | 3 + d |

**Practical caps derived from the 25-write limit:**

| Operation | Safe upper bound |
|---|---|
| `create_shipment` | ≤ 19 milestones in a single tx |
| `batch_confirm_milestones` | ≤ 23 milestones per batch |
| `extend_shipment_ttl` | ≤ 23 milestones per call |

> The admin-configurable maximum milestone count (`set_max_milestone_count`, default 50) does not guarantee a shipment can be created in one transaction. Keep milestone counts at or below 15 for reliable single-transaction creation.

---

## 7. Integrator Guidelines

### 7.1 Fee estimation before submission

Run every state-changing call as a **preflight simulation** before signing and submitting:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --fee 1000000 \
  --simulate-only \
  -- confirm_milestone \
  --buyer <BUYER_ADDRESS> \
  --shipment_id "SHIP-001" \
  --milestone_index 0
```

The preflight response includes `cost.cpuInsns` and `cost.memBytes`. If `cpuInsns` exceeds 80 M (80% of the limit), consider splitting the operation.

### 7.2 Batch operations

Use `batch_confirm_milestones` when multiple proofs are ready simultaneously. For large milestones counts (> 6) or fee-heavy configurations, simulate first to confirm the batch stays within limits.

### 7.3 Keeper / cron patterns

The following permissionless functions are designed for automated keeper bots:

| Function | Trigger condition | Suggested frequency |
|---|---|---|
| `extend_shipment_ttl` | `current_ledger > created_at + 75_000` | Every ~50 000 ledgers (~70 days) per active shipment |
| `claim_auto_confirmation` | `current_ledger >= proof_submitted_ledger + window` | Poll every 100–500 ledgers |
| `resolve_dispute_timeout` | `current_timestamp >= opened_at + dispute_timeout_seconds` | Poll every 100–500 ledgers |
| `check_escalation` | `current_ledger >= dispute_opened_ledger + threshold` | Poll every 100–500 ledgers |

### 7.4 Read-only vs. state-changing calls

Read-only calls (all `get_*` functions, `list_shipments`, `is_*`, `estimate_*`) can be called without signing and without a fee by using `stellar contract invoke --view` or an RPC `simulateTransaction` request. Use read-only calls freely for dashboards and monitoring.

### 7.5 Multi-token deployments

Functions like `get_total_escrowed_value(token)`, `claim_payout(supplier, token)`, and `vault_deposit/withdraw` all take an explicit `token` address. Make sure your integration always passes the correct SAC address; the contract does not perform cross-token conversion automatically outside the `claim_payout` currency-preference path.

---

## 8. Regenerating Measurements

The benchmark harness is in `contracts/stellarsettle/src/benchmarks.rs`. It uses the `soroban-sdk` test environment and is gated by `#[cfg(test)]`, so it only runs during `cargo test`.

### 8.1 Run all benchmarks

```bash
# From the workspace root or the contract crate directory
cargo test -p stellarsettle benchmark_all_functions -- --nocapture
```

Sample output:

```
🔬 Running StellarSettle Contract Benchmarks
================================================================================

📦 Benchmarking with 1 milestone:
  create_shipment (milestones=1): <N> instructions
  submit_proof (milestones=1): <N> instructions
  confirm_milestone (milestones=1): <N> instructions
  raise_dispute (milestones=1): <N> instructions
  resolve_dispute (milestones=1): <N> instructions
  cancel_shipment (milestones=1): <N> instructions

📦 Benchmarking with 10 milestones:
  create_shipment (milestones=10): <N> instructions
  ...
```

### 8.2 Run a single benchmark

```bash
# Only benchmark create_shipment
cargo test -p stellarsettle benchmark_create_shipment_only -- --nocapture

# Only benchmark confirm_milestone
cargo test -p stellarsettle benchmark_confirm_milestone_only -- --nocapture

# Only benchmark raise_dispute
cargo test -p stellarsettle benchmark_raise_dispute_only -- --nocapture

# Only benchmark resolve_dispute
cargo test -p stellarsettle benchmark_resolve_dispute_only -- --nocapture

# Only benchmark submit_proof
cargo test -p stellarsettle benchmark_submit_proof_only -- --nocapture

# Only benchmark cancel_shipment
cargo test -p stellarsettle benchmark_cancel_shipment_only -- --nocapture
```

### 8.3 Save a new baseline

After intentional changes that increase instruction counts, update the stored baseline so future runs compare against the new expected values:

```bash
UPDATE_BASELINES=1 cargo test -p stellarsettle benchmark_all_functions -- --nocapture
```

This writes (or overwrites) `contracts/stellarsettle/benchmarks/baselines.json` with the current measurements and a timestamp.

### 8.4 Adding benchmarks for new functions

1. Open `contracts/stellarsettle/src/benchmarks.rs`.
2. Follow the pattern of the existing `benchmark_*` functions: set up the necessary preconditions, call `measure_instructions(&env, || { client.your_function(...) })`, and return a `BenchmarkResult`.
3. Add your function to `run_all_benchmarks()`.
4. Optionally add a focused single-function test entry point (`#[test] fn benchmark_your_function_only()`).
5. Run with `UPDATE_BASELINES=1` to record the initial baseline.

```rust
fn benchmark_my_function(milestone_count: u32) -> BenchmarkResult {
    let setup = setup_benchmark();
    let client = StellarSettleContractClient::new(&setup.env, &setup.contract_id);

    // ... set up preconditions (create shipment, submit proof, etc.) ...

    let instructions = measure_instructions(&setup.env, || {
        client.my_function(/* args */);
    });

    BenchmarkResult {
        function_name: String::from("my_function"),
        milestone_count,
        instructions,
    }
}
```

### 8.5 Measuring the loan_manager

The loan_manager does not yet have a dedicated benchmark harness. To measure it, add a benchmark test file at `contracts/loan_manager/src/benchmarks.rs` following the same pattern and use:

```bash
cargo test -p loan_manager -- --nocapture
```

---

## 9. Regression Guard

The benchmark harness enforces a **10% regression threshold** on every run. If any function's instruction count grows by more than 10% compared to the stored baseline, `benchmark_all_functions` will fail with:

```
❌ Benchmark regression detected! Instructions exceeded threshold.
```

The threshold is defined as a constant in `benchmarks.rs`:

```rust
const REGRESSION_THRESHOLD: f64 = 1.10; // 10% increase allowed
```

To adjust the threshold (e.g. to 5% for tighter budgets):

```rust
const REGRESSION_THRESHOLD: f64 = 1.05;
```

### CI integration

Add the benchmark check to your CI pipeline to catch regressions on every pull request:

```yaml
# .github/workflows/ci.yml — add this step after cargo test
- name: Benchmark regression check
  run: cargo test -p stellarsettle benchmark_all_functions -- --nocapture
```

If `benchmarks/baselines.json` does not exist (first run on a fresh checkout), the test skips the regression check and prints a warning. Create the baseline file by running with `UPDATE_BASELINES=1` once and committing `benchmarks/baselines.json` to the repository.

---

*Last updated: 2026-10-21 · Issue #100*
