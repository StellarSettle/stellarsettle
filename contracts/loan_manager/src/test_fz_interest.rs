#![cfg(test)]

extern crate std;

// #222: interest-rate behaviour. The pool stores a capped rate but does not
// accrue interest on debt, so there is no compound model to test.

use crate::constants::MAX_INTEREST_RATE_BPS;
use crate::test::test_common::{advance_time, open_position, seed_liquidity, setup};

#[test]
fn test_fz_zero_interest_by_default() {
    let s = setup();
    assert_eq!(s.client().get_interest_rate(), 0);
}

#[test]
fn test_fz_zero_interest_debt_unchanged_over_time() {
    let s = setup();
    seed_liquidity(&s, &[&s.d1], &[100_000]);
    open_position(&s, &s.alice, 2_000, 1_000);
    advance_time(&s.env, 1_000_000);
    assert_eq!(s.client().get_position(&s.alice).debt, 1_000);
}

#[test]
fn test_fz_simple_interest_rate_set_does_not_accrue() {
    let s = setup();
    s.client().set_interest_rate(&s.admin, &500);
    assert_eq!(s.client().get_interest_rate(), 500);
    seed_liquidity(&s, &[&s.d1], &[100_000]);
    open_position(&s, &s.alice, 2_000, 1_000);
    advance_time(&s.env, 31_536_000);
    assert_eq!(s.client().get_position(&s.alice).debt, 1_000);
}

#[test]
fn test_fz_interest_rate_at_cap_accepted() {
    let s = setup();
    s.client().set_interest_rate(&s.admin, &MAX_INTEREST_RATE_BPS);
    assert_eq!(s.client().get_interest_rate(), MAX_INTEREST_RATE_BPS);
}

#[test]
#[should_panic(expected = "interest rate above cap")]
fn test_fz_interest_rate_above_cap_rejected() {
    let s = setup();
    s.client().set_interest_rate(&s.admin, &(MAX_INTEREST_RATE_BPS + 1));
}

#[test]
#[should_panic]
fn test_fz_borrow_overflowing_principal_rejected() {
    let s = setup();
    seed_liquidity(&s, &[&s.d1], &[100_000]);
    open_position(&s, &s.alice, 1_000, i128::MAX);
}
