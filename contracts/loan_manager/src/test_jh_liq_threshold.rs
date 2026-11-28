#![cfg(test)]

extern crate std;

// #224: liquidation threshold boundary conditions.

use crate::test::test_common::{open_position, seed_liquidity, setup, Setup};

fn price(s: &Setup, p: i128) {
    s.primary_oracle().set_price(&s.coll_id, &p);
}

// 2_000 collateral / 1_000 debt at an 80% threshold: boundary price is 0.625.
fn healthy(s: &Setup) {
    seed_liquidity(s, &[&s.d1], &[10_000]);
    open_position(s, &s.alice, 2_000, 1_000);
}

#[test]
#[should_panic(expected = "position not liquidatable")]
fn test_jh_just_above_threshold_not_liquidatable() {
    let s = setup();
    healthy(&s);
    price(&s, 62_500_001);
    s.client().liquidate(&s.bob, &s.alice, &0i128);
}

#[test]
fn test_jh_price_drop_below_threshold_is_liquidatable() {
    let s = setup();
    healthy(&s);
    price(&s, 62_500_001);
    price(&s, 50_000_000);
    let res = s.client().liquidate(&s.bob, &s.alice, &0i128);
    assert!(res.repay_units > 0);
    assert!(res.seize_units > 0);
}

#[test]
#[should_panic(expected = "position not liquidatable")]
fn test_jh_exactly_at_threshold_not_liquidatable() {
    let s = setup();
    healthy(&s);
    price(&s, 62_500_000);
    s.client().liquidate(&s.bob, &s.alice, &0i128);
}

#[test]
fn test_jh_one_unit_below_threshold_is_liquidatable() {
    let s = setup();
    healthy(&s);
    price(&s, 62_499_999);
    let res = s.client().liquidate(&s.bob, &s.alice, &0i128);
    assert!(res.repay_units > 0);
}
