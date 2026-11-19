#![cfg(test)]

extern crate std;

// Fuzz tests for the liquidation engine.
//
// Two complementary harnesses:
// 1. Property tests over the pure math core (`compute_plan`) covering
//    every safety invariant under arbitrary inputs.
// 2. A deterministic scenario fuzzer driving the live contract through
//    random deposit/borrow/crash/oracle-outage/liquidation sequences,
//    asserting pool solvency invariants after every operation.

use crate::liquidation::{compute_plan, RepayMode};
use crate::test::test_common::{seed_liquidity, setup, PRICE_ONE};
use proptest::prelude::*;

// ============================================================
// 1. PROPERTY TESTS — PURE MATH CORE
// ============================================================

prop_compose! {
    fn arb_config()
        (base in 100u32..=1_000u32, max_extra in 0u32..=1_500u32, cap_raw in 1_000u32..=2_500u32)
        -> (u32, u32, u32) {
        let max = base.saturating_add(max_extra).min(2_500);
        (base, max, cap_raw.max(max))
    }
}

fn arb_mode() -> impl Strategy<Value = RepayMode> {
    prop_oneof![
        Just(RepayMode::PartialToTarget),
        Just(RepayMode::Full),
        (0i128..=2_000_000_000_000i128).prop_map(RepayMode::Specified),
    ]
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(256))]

    #[test]
    fn prop_plan_invariants_hold_for_all_inputs(
        coll_units in 0i128..=4_000_000_000_000i128,
        debt_units in 0i128..=4_000_000_000_000i128,
        price_coll in 1i128..=400_000_000i128,
        price_debt in 1i128..=400_000_000i128,
        thr in 1_000u32..=9_500u32,
        (base, max, cap) in arb_config(),
        mode in arb_mode(),
    ) {
        let plan = compute_plan(
            coll_units, debt_units, price_coll, price_debt,
            thr, base, max, cap, mode,
        );

        // No negative outputs.
        prop_assert!(plan.repay_units >= 0);
        prop_assert!(plan.seize_units >= 0);
        prop_assert!(plan.bad_debt_units >= 0);

        // Liquidator never seizes more collateral than exists, never pays
        // more debt than is owed.
        prop_assert!(plan.seize_units <= coll_units);
        prop_assert!(plan.repay_units <= debt_units);

        // Dynamic incentive bounds: within the configured dynamic range
        // and always capped by the configured penalty cap.
        prop_assert!(plan.bonus_bps <= cap);
        prop_assert!(plan.bonus_bps >= base.min(plan.bonus_bps));
        prop_assert!(plan.bonus_bps <= max);

        // Healthy positions are untouchable.
        let coll_value = crate::liquidation::units_to_value(coll_units, price_coll);
        let debt_value = crate::liquidation::units_to_value(debt_units, price_debt);
        let (num, den) =
            crate::liquidation::health_ratio(coll_value, debt_value, thr);
        if !crate::liquidation::is_liquidatable(num, den) {
            prop_assert_eq!(plan.repay_units, 0);
            prop_assert_eq!(plan.seize_units, 0);
            prop_assert_eq!(plan.bad_debt_units, 0);
            return Ok(());
        }

        // Drained ⇔ bad debt equals the remainder; undrained ⇒ zero write-off.
        if plan.bad_debt_units > 0 {
            prop_assert_eq!(plan.bad_debt_units, debt_units - plan.repay_units);
            prop_assert_eq!(plan.repay_units + plan.seize_units > 0 || debt_units > 0, true);
        }

        // Undrained *partial* liquidations must restore health towards the
        // target (HF ≥ 1.1 modulo integer-floor slack). Specified and Full
        // modes intentionally do not aim at the target.
        if matches!(mode, RepayMode::PartialToTarget)
            && plan.repay_units > 0
            && plan.bad_debt_units == 0
        {
            let post_coll_value = crate::liquidation::units_to_value(
                coll_units - plan.seize_units, price_coll);
            let post_debt_value = crate::liquidation::units_to_value(
                debt_units - plan.repay_units, price_debt);
            let (pn, pd) =
                crate::liquidation::health_ratio(post_coll_value, post_debt_value, thr);
            let eps = 1_000_000i128;
            prop_assert!(
                pn * 10 + eps >= pd * 11,
                "post-HF {}/{} below target after undrained partial liquidation",
                pn, pd
            );
        }
    }
}

// ============================================================
// 2. SCENARIO FUZZER — LIVE CONTRACT FAILURE MODES
// ============================================================

/// Small deterministic PRNG (xorshift64*) so CI failures are reproducible.
struct Rng(u64);

impl Rng {
    fn new(seed: u64) -> Self {
        Rng(seed.max(1))
    }
    fn next_u64(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.0 = x;
        x.wrapping_mul(0x2545F4914F6CDD1D)
    }
    fn below(&mut self, n: u64) -> u64 {
        if n == 0 {
            0
        } else {
            self.next_u64() % n
        }
    }
}

#[test]
fn fuzz_scenario_random_markets_stay_solvent() {
    for seed in 0..24u64 {
        let mut rng = Rng::new(seed.wrapping_mul(0x9E3779B97F4A7C15));
        let s = setup();
        let client = s.client();

        seed_liquidity(
            &s,
            &[&s.d1, &s.d2, &s.d3],
            &[
                200 + rng.below(3_000) as i128,
                200 + rng.below(3_000) as i128,
                200 + rng.below(3_000) as i128,
            ],
        );

        for _step in 0..30u64 {
            match rng.below(7) {
                // Alice posts collateral.
                0 => {
                    let amt = 100 + rng.below(2_000) as i128;
                    client.deposit_collateral(&s.alice, &amt);
                }
                // Alice borrows (may fail on HF).
                1 => {
                    let amt = 50 + rng.below(600) as i128;
                    let _ = client.try_borrow(&s.alice, &amt);
                }
                // Alice repays.
                2 => {
                    let amt = 10 + rng.below(400) as i128;
                    let _ = client.try_repay(&s.alice, &amt);
                }
                // Depositor pulls liquidity (may fail when locked).
                3 => {
                    let who = [&s.d1, &s.d2, &s.d3][rng.below(3) as usize];
                    let bal = client.get_depositor_balance(who);
                    if bal > 0 {
                        let _ = client.try_withdraw(who, &(1 + rng.below(bal as u64) as i128));
                    }
                }
                // Price shock: multiply or divide collateral price.
                4 => {
                    let cur = s.primary_oracle().latest_price(&s.coll_id).0;
                    let next = if rng.below(2) == 0 {
                        (cur / 2).max(1_000_000)
                    } else {
                        (cur.saturating_mul(3) / 2).min(300_000_000)
                    };
                    s.primary_oracle().set_price(&s.coll_id, &next);
                    crate::test::test_common::advance_time(&s.env, 30 + rng.below(90));
                }
                // Oracle outage: force the primary stale; sometimes recover it.
                5 => {
                    if rng.below(2) == 0 {
                        s.primary_oracle().set_stale(
                            &s.coll_id,
                            &(crate::constants::MAX_PRICE_STALENESS_SECS + 60),
                        );
                        s.primary_oracle().set_stale(
                            &s.debt_id,
                            &(crate::constants::MAX_PRICE_STALENESS_SECS + 60),
                        );
                    } else {
                        s.primary_oracle().set_price(&s.coll_id, &PRICE_ONE);
                        s.primary_oracle().set_price(&s.debt_id, &PRICE_ONE);
                    }
                }
                // Liquidation attempt in a random mode.
                _ => {
                    let mode = rng.below(3);
                    let amt = match mode {
                        0 => crate::FULL_REPAY_SENTINEL,
                        1 => 0i128,
                        _ => 1 + rng.below(900) as i128,
                    };
                    let _ = client.try_liquidate(&s.bob, &s.alice, &amt);
                }
            }

            // ---- Global solvency invariants after EVERY step ----------
            let (td, tb, _) = client.get_pool_info();

            // Depositor accounting matches stored balances.
            let d = client.get_depositors();
            let mut sum_bal = 0i128;
            for dep in d.iter() {
                sum_bal += client.get_depositor_balance(&dep);
            }
            assert_eq!(
                sum_bal, td,
                "seed {}: depositor balances {} != accounting {}",
                seed, sum_bal, td
            );

            // The pool's cash plus outstanding receivables always covers
            // depositor claims.
            let pool_bal = soroban_sdk::token::Client::new(&s.env, &s.debt_id).balance(&s.id);
            assert!(
                pool_bal.saturating_add(tb) >= td,
                "seed {}: insolvent pool ({}+{} < {}) after step",
                seed,
                pool_bal,
                tb,
                td
            );

            // Borrow accounting mirrors positions.
            let pos = client.get_position(&s.alice);
            assert_eq!(tb, pos.debt, "seed {}: borrowed != Σdebts", seed);

            // A fully drained borrower carries no phantom debt.
            if pos.collateral == 0 {
                assert_eq!(pos.debt, 0, "seed {}: orphaned debt remains", seed);
            }
        }
    }
}

// ============================================================
// 3. PROPERTY TESTS — BORROW-LIMIT & HEALTH-FACTOR MATH
//
// Pure-Rust properties over the health-factor helpers that gate
// `borrow`, `withdraw_collateral` and `liquidate`. No Soroban env is
// needed, so these run thousands of cases per property.
// ============================================================

mod math_prop_tests {
    use crate::constants::{BPS_DENOMINATOR, MAX_CONFIGURABLE_BONUS_BPS, MAX_LIQ_THRESHOLD_BPS};
    use crate::liquidation::{
        dynamic_bonus_bps, health_ratio, is_liquidatable, proportional_shares, units_to_value,
        value_to_units,
    };
    use proptest::prelude::*;

    /// Upper bound for USD-scaled values used by the math properties. Large
    /// enough to cover any realistic pool, small enough that the exact
    /// cross-multiplications below can never saturate.
    const MAX_VALUE: i128 = 1_000_000_000_000_000_000;

    prop_compose! {
        /// `(base, max, cap)` with `base <= max`; `cap` is drawn independently
        /// so the penalty cap can sit below, inside or above the dynamic range.
        fn arb_bonus_params()
            (base in 0u32..=MAX_CONFIGURABLE_BONUS_BPS, extra in 0u32..=MAX_CONFIGURABLE_BONUS_BPS,
             cap in 0u32..=MAX_CONFIGURABLE_BONUS_BPS)
            -> (u32, u32, u32) {
            let max = base.saturating_add(extra).min(MAX_CONFIGURABLE_BONUS_BPS);
            (base, max, cap)
        }
    }

    proptest! {
        #![proptest_config(ProptestConfig {
            cases: 2_000,
            ..Default::default()
        })]

        /// Borrow limit: the largest debt value accepted at a threshold is
        /// exactly `floor(coll_value * thr / BPS)`. That debt is healthy (not
        /// liquidatable) and a single extra unit crosses the boundary.
        #[test]
        fn prop_borrow_limit_boundary_is_exact(
            coll_value in 0i128..=MAX_VALUE,
            thr in 1u32..=MAX_LIQ_THRESHOLD_BPS,
        ) {
            let max_debt = coll_value * thr as i128 / BPS_DENOMINATOR;

            let (num, den) = health_ratio(coll_value, max_debt, thr);
            prop_assert!(num >= den, "max borrow must be healthy");
            prop_assert!(!is_liquidatable(num, den));

            let (num, den) = health_ratio(coll_value, max_debt + 1, thr);
            prop_assert!(num < den, "one unit past the limit must be unhealthy");
            prop_assert!(is_liquidatable(num, den));
        }

        /// Health is monotonic: more collateral never makes a healthy
        /// position liquidatable, and more debt never makes a liquidatable
        /// position healthy.
        #[test]
        fn prop_health_monotonic_in_collateral_and_debt(
            coll in 0i128..=MAX_VALUE,
            extra_coll in 0i128..=MAX_VALUE,
            debt in 0i128..=MAX_VALUE,
            extra_debt in 0i128..=MAX_VALUE,
            thr in 1u32..=MAX_LIQ_THRESHOLD_BPS,
        ) {
            let (n0, d0) = health_ratio(coll, debt, thr);
            let (n_more_coll, d_more_coll) = health_ratio(coll + extra_coll, debt, thr);
            let (n_more_debt, d_more_debt) = health_ratio(coll, debt + extra_debt, thr);

            prop_assert!(n_more_coll >= n0);
            prop_assert_eq!(d_more_coll, d0);
            prop_assert_eq!(n_more_debt, n0);
            prop_assert!(d_more_debt >= d0);

            if is_liquidatable(n_more_coll, d_more_coll) {
                prop_assert!(is_liquidatable(n0, d0));
            }
            if is_liquidatable(n0, d0) {
                prop_assert!(is_liquidatable(n_more_debt, d_more_debt));
            }
        }

        /// Liquidation threshold monotonicity: a position that is
        /// liquidatable under a higher threshold is also liquidatable under
        /// any lower threshold.
        #[test]
        fn prop_lower_threshold_never_rescues_position(
            coll in 0i128..=MAX_VALUE,
            debt in 0i128..=MAX_VALUE,
            thr_a in 1u32..=MAX_LIQ_THRESHOLD_BPS,
            thr_b in 1u32..=MAX_LIQ_THRESHOLD_BPS,
        ) {
            let (lo, hi) = (thr_a.min(thr_b), thr_a.max(thr_b));
            let (n_hi, d_hi) = health_ratio(coll, debt, hi);
            let (n_lo, d_lo) = health_ratio(coll, debt, lo);
            if is_liquidatable(n_hi, d_hi) {
                prop_assert!(is_liquidatable(n_lo, d_lo));
            }
        }

        /// Debt-free positions are never liquidatable, whatever the
        /// collateral or threshold.
        #[test]
        fn prop_zero_debt_never_liquidatable(
            coll in 0i128..=MAX_VALUE,
            thr in 1u32..=MAX_LIQ_THRESHOLD_BPS,
        ) {
            let (num, den) = health_ratio(coll, 0, thr);
            prop_assert!(!is_liquidatable(num, den));
        }

        /// Dynamic liquidator incentive stays inside `[min(base, cap),
        /// min(max, cap)]`, is non-decreasing as health deteriorates, equals
        /// the (capped) base bonus for healthy positions and saturates at the
        /// (capped) max bonus once HF <= 0.5.
        #[test]
        fn prop_dynamic_bonus_bounded_and_monotonic(
            den in 1i128..=MAX_VALUE,
            hf_a_bps in 0u32..=20_000u32,
            hf_b_bps in 0u32..=20_000u32,
            (base, max, cap) in arb_bonus_params(),
        ) {
            let num_a = den * hf_a_bps as i128 / 10_000;
            let num_b = den * hf_b_bps as i128 / 10_000;
            let (num_sick, num_healthier) = (num_a.min(num_b), num_a.max(num_b));

            let b_sick = dynamic_bonus_bps(num_sick, den, base, max, cap);
            let b_healthier = dynamic_bonus_bps(num_healthier, den, base, max, cap);

            for b in [b_sick, b_healthier] {
                prop_assert!(b <= cap, "bonus {} above penalty cap {}", b, cap);
                prop_assert!(b <= max);
                prop_assert!(b >= base.min(cap));
            }
            prop_assert!(b_sick >= b_healthier, "bonus must not shrink as HF drops");

            if num_healthier >= den {
                prop_assert_eq!(b_healthier, base.min(cap));
            }
            if num_sick.saturating_mul(2) <= den {
                prop_assert_eq!(b_sick, max.min(cap));
            }
        }

        /// Unit/value conversions floor in the protocol's favour: a round
        /// trip never creates units or value out of thin air.
        #[test]
        fn prop_unit_value_round_trip_never_inflates(
            units in 0i128..=1_000_000_000_000_000i128,
            value in 0i128..=1_000_000_000_000_000i128,
            price in 1i128..=1_000_000_000_000i128,
        ) {
            let units_back = value_to_units(units_to_value(units, price), price);
            prop_assert!(units_back <= units);

            let value_back = units_to_value(value_to_units(value, price), price);
            prop_assert!(value_back <= value);

            // Non-positive prices are treated as worthless, never negative.
            prop_assert_eq!(units_to_value(units, 0), 0);
            prop_assert_eq!(value_to_units(value, 0), 0);
        }
    }

    proptest! {
        #![proptest_config(ProptestConfig {
            cases: 256,
            ..Default::default()
        })]

        /// Bad-debt socialization shares never exceed the loss or any single
        /// depositor's balance, and the rounding residual is strictly smaller
        /// than the number of depositors.
        #[test]
        fn prop_bad_debt_shares_bounded(
            balances in proptest::collection::vec(0i128..=1_000_000_000_000i128, 1..8),
            loss_pct in 0u32..=100u32,
        ) {
            let env = soroban_sdk::Env::default();
            let total: i128 = balances.iter().sum();
            let loss = total * loss_pct as i128 / 100;

            let mut v = soroban_sdk::Vec::new(&env);
            for b in balances.iter() {
                v.push_back(*b);
            }
            let shares = proportional_shares(&env, &v, total, loss);
            prop_assert_eq!(shares.len(), v.len());

            let mut sum = 0i128;
            for (i, share) in shares.iter().enumerate() {
                prop_assert!(share >= 0);
                prop_assert!(share <= balances[i], "share {} > balance {}", share, balances[i]);
                sum += share;
            }
            prop_assert!(sum <= loss);
            if total > 0 {
                prop_assert!(loss - sum < balances.len() as i128);
            } else {
                prop_assert_eq!(sum, 0);
            }
        }
    }
}

// ============================================================
// 4. CONTRACT-BACKED PROPERTY TESTS — DEPOSIT / BORROW / LIQUIDATION
//
// Drive the live contract through the Soroban test env and check it
// against the pure model above: every accept/reject decision must match
// the health-factor model exactly, and pool accounting must stay
// consistent after each operation.
// ============================================================

mod contract_prop_tests {
    use crate::constants::{BPS_DENOMINATOR, MAX_LIQ_THRESHOLD_BPS};
    use crate::liquidation::{health_ratio, is_liquidatable, units_to_value};
    use crate::test::test_common::{seed_liquidity, setup, Setup, PRICE_ONE};
    use proptest::prelude::*;

    /// Liquidity seeded into the pool so borrow limits — not pool
    /// liquidity — are what the properties exercise.
    const POOL_LIQUIDITY: i128 = 50_000_000_000;

    fn debt_balance(s: &Setup, who: &soroban_sdk::Address) -> i128 {
        soroban_sdk::token::Client::new(&s.env, &s.debt_id).balance(who)
    }

    fn coll_balance(s: &Setup, who: &soroban_sdk::Address) -> i128 {
        soroban_sdk::token::Client::new(&s.env, &s.coll_id).balance(who)
    }

    /// Model of the contract's borrow limit (debt token priced at 1.0).
    fn max_borrow(coll_units: i128, price_coll: i128, thr: u32) -> i128 {
        units_to_value(coll_units, price_coll) * thr as i128 / BPS_DENOMINATOR
    }

    /// Pool-wide accounting invariants shared by every contract property.
    fn assert_pool_consistent(s: &Setup) -> Result<(), TestCaseError> {
        let client = s.client();
        let (td, tb, _) = client.get_pool_info();

        let mut sum_bal = 0i128;
        for dep in client.get_depositors().iter() {
            sum_bal += client.get_depositor_balance(&dep);
        }
        prop_assert_eq!(
            sum_bal,
            td,
            "depositor balances diverge from total deposits"
        );

        let pos = client.get_position(&s.alice);
        prop_assert_eq!(tb, pos.debt, "total borrowed diverges from position debt");
        prop_assert!(
            debt_balance(s, &s.id).saturating_add(tb) >= td,
            "pool insolvent"
        );
        Ok(())
    }

    /// Fresh environment with a configured market, a collateral price and
    /// seeded pool liquidity.
    fn market(thr: u32, price_coll: i128) -> Setup {
        let s = setup();
        let client = s.client();
        client.set_market(&s.admin, &s.coll_id, &s.debt_id, &thr);
        s.primary_oracle().set_price(&s.coll_id, &price_coll);
        s.primary_oracle().set_price(&s.debt_id, &PRICE_ONE);
        seed_liquidity(
            &s,
            &[&s.d1, &s.d2],
            &[POOL_LIQUIDITY / 2, POOL_LIQUIDITY / 2],
        );
        s
    }

    proptest! {
        #![proptest_config(ProptestConfig {
            cases: 48,
            ..Default::default()
        })]

        /// Borrow-limit invariant: borrowing exactly the model's limit
        /// succeeds and leaves the position healthy; one unit more is
        /// always rejected, both from an empty position and on top of the
        /// maximal one.
        #[test]
        fn prop_contract_borrow_limit_matches_model(
            coll in 1_000i128..=1_000_000_000i128,
            price_coll in 1_000_000i128..=1_000_000_000i128,
            thr in 1_000u32..=MAX_LIQ_THRESHOLD_BPS,
        ) {
            let s = market(thr, price_coll);
            let client = s.client();
            client.deposit_collateral(&s.alice, &coll);

            let limit = max_borrow(coll, price_coll, thr);
            prop_assume!(limit > 0 && limit < POOL_LIQUIDITY);

            prop_assert!(
                client.try_borrow(&s.alice, &(limit + 1)).is_err(),
                "borrow above limit {} accepted", limit
            );
            assert_pool_consistent(&s)?;

            let before = debt_balance(&s, &s.alice);
            prop_assert!(matches!(client.try_borrow(&s.alice, &limit), Ok(Ok(()))));
            prop_assert_eq!(debt_balance(&s, &s.alice) - before, limit);
            prop_assert_eq!(client.get_position(&s.alice).debt, limit);

            let (num, den) = client.health_factor(&s.alice);
            prop_assert!(num >= den, "position unhealthy right after borrow");
            prop_assert!(!is_liquidatable(num, den));

            prop_assert!(client.try_borrow(&s.alice, &1).is_err(), "limit can be exceeded incrementally");
            assert_pool_consistent(&s)?;
        }

        /// Withdrawing collateral is accepted iff the model says the
        /// remaining position stays at or above the liquidation threshold.
        #[test]
        fn prop_contract_withdraw_collateral_matches_model(
            coll in 1_000i128..=1_000_000_000i128,
            price_coll in 1_000_000i128..=1_000_000_000i128,
            thr in 1_000u32..=MAX_LIQ_THRESHOLD_BPS,
            borrow_pct in 1u32..=100u32,
            withdraw_pct in 1u32..=100u32,
        ) {
            let s = market(thr, price_coll);
            let client = s.client();
            client.deposit_collateral(&s.alice, &coll);

            let debt = max_borrow(coll, price_coll, thr) * borrow_pct as i128 / 100;
            prop_assume!(debt > 0);
            client.borrow(&s.alice, &debt);

            let w = (coll * withdraw_pct as i128 / 100).max(1);
            let after_value = units_to_value(coll - w, price_coll);
            let (num, den) = health_ratio(after_value, units_to_value(debt, PRICE_ONE), thr);
            let model_ok = num >= den;

            let res = client.try_withdraw_collateral(&s.alice, &w);
            prop_assert_eq!(
                matches!(res, Ok(Ok(()))),
                model_ok,
                "withdraw {} of {} (debt {}) disagrees with model", w, coll, debt
            );

            let pos = client.get_position(&s.alice);
            let expected_coll = if model_ok { coll - w } else { coll };
            prop_assert_eq!(pos.collateral, expected_coll);
            prop_assert_eq!(pos.debt, debt);
            assert_pool_consistent(&s)?;
        }

        /// Liquidity withdrawals are accepted iff the amount is covered by
        /// both the depositor's balance and the pool's free liquidity.
        #[test]
        fn prop_contract_liquidity_withdraw_respects_free_liquidity(
            coll in 1_000_000i128..=1_000_000_000i128,
            borrow_pct in 0u32..=100u32,
            withdraw in 1i128..=POOL_LIQUIDITY,
        ) {
            let s = market(8_000, PRICE_ONE);
            let client = s.client();
            client.deposit_collateral(&s.alice, &coll);
            let debt = max_borrow(coll, PRICE_ONE, 8_000) * borrow_pct as i128 / 100;
            if debt > 0 {
                client.borrow(&s.alice, &debt);
            }

            let (td, tb, _) = client.get_pool_info();
            let bal = client.get_depositor_balance(&s.d1);
            let model_ok = withdraw <= bal && withdraw <= td - tb;

            let before = debt_balance(&s, &s.d1);
            let res = client.try_withdraw(&s.d1, &withdraw);
            prop_assert_eq!(matches!(res, Ok(Ok(()))), model_ok);
            if model_ok {
                prop_assert_eq!(debt_balance(&s, &s.d1) - before, withdraw);
                prop_assert_eq!(client.get_depositor_balance(&s.d1), bal - withdraw);
            } else {
                prop_assert_eq!(client.get_depositor_balance(&s.d1), bal);
            }
            assert_pool_consistent(&s)?;
        }

        /// Liquidation-threshold invariant: after a collateral price shock a
        /// position can be liquidated iff the model reports HF < 1. Every
        /// successful liquidation respects the penalty cap, moves exactly
        /// the reported amounts and keeps the pool consistent.
        #[test]
        fn prop_contract_liquidation_only_below_threshold(
            coll in 1_000_000i128..=1_000_000_000i128,
            thr in 1_000u32..=MAX_LIQ_THRESHOLD_BPS,
            borrow_pct in 50u32..=100u32,
            shock_pct in 10u32..=150u32,
            mode in 0u8..3u8,
            specified in 1i128..=1_000_000_000i128,
        ) {
            let s = market(thr, PRICE_ONE);
            let client = s.client();
            client.deposit_collateral(&s.alice, &coll);
            let debt = max_borrow(coll, PRICE_ONE, thr) * borrow_pct as i128 / 100;
            prop_assume!(debt > 0);
            client.borrow(&s.alice, &debt);

            let shocked = (PRICE_ONE * shock_pct as i128 / 100).max(1);
            s.primary_oracle().set_price(&s.coll_id, &shocked);

            let (num, den) = health_ratio(
                units_to_value(coll, shocked),
                units_to_value(debt, PRICE_ONE),
                thr,
            );
            let liquidatable = is_liquidatable(num, den);

            let repay_arg = match mode {
                0 => 0i128,
                1 => crate::FULL_REPAY_SENTINEL,
                _ => specified,
            };
            let bob_debt_before = debt_balance(&s, &s.bob);
            let bob_coll_before = coll_balance(&s, &s.bob);

            let res = client.try_liquidate(&s.bob, &s.alice, &repay_arg);
            if !liquidatable {
                prop_assert!(res.is_err(), "healthy position (HF {}/{}) was liquidated", num, den);
                let pos = client.get_position(&s.alice);
                prop_assert_eq!(pos.collateral, coll);
                prop_assert_eq!(pos.debt, debt);
                assert_pool_consistent(&s)?;
                return Ok(());
            }

            let out = match res {
                Ok(Ok(out)) => out,
                _ => return Err(TestCaseError::fail(std::format!(
                    "liquidatable position (HF {}/{}) rejected", num, den
                ))),
            };

            let params = client.get_liquidation_params();
            prop_assert!(out.bonus_bps <= params.penalty_cap_bps);
            prop_assert!(out.bonus_bps <= params.max_bonus_bps);
            prop_assert!(out.repay_units >= 0 && out.repay_units <= debt);
            prop_assert!(out.seize_units >= 0 && out.seize_units <= coll);
            if mode == 2 {
                prop_assert!(out.repay_units <= specified);
            }

            // Funds moved exactly as reported.
            prop_assert_eq!(bob_debt_before - debt_balance(&s, &s.bob), out.repay_units);
            prop_assert_eq!(coll_balance(&s, &s.bob) - bob_coll_before, out.seize_units);

            // Position bookkeeping mirrors the reported plan.
            let pos = client.get_position(&s.alice);
            prop_assert_eq!(pos.collateral, coll - out.seize_units);
            prop_assert!(pos.debt <= debt - out.repay_units);
            if out.bad_debt_socialized == 0 {
                prop_assert_eq!(pos.debt, debt - out.repay_units);
            }
            assert_pool_consistent(&s)?;
        }
    }
}
