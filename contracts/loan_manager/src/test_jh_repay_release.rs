#![cfg(test)]

extern crate std;

// #223: full repayment followed by collateral release.

use crate::test::test_common::{open_position, seed_liquidity, setup};
use soroban_sdk::token;

#[test]
fn test_full_repay_then_collateral_released() {
    let s = setup();
    seed_liquidity(&s, &[&s.d1], &[10_000]);
    let coll = token::Client::new(&s.env, &s.coll_id);
    let before = coll.balance(&s.alice);

    open_position(&s, &s.alice, 2_000, 1_000);
    assert_eq!(coll.balance(&s.alice), before - 2_000);

    // The loan manager has no interest model: principal is the full debt.
    s.client().repay(&s.alice, &1_000);
    assert_eq!(s.client().get_position(&s.alice).debt, 0);

    s.client().withdraw_collateral(&s.alice, &2_000);
    assert_eq!(s.client().get_position(&s.alice).collateral, 0);
    assert_eq!(coll.balance(&s.alice), before);
}

#[test]
#[should_panic]
fn test_collateral_cannot_be_released_with_outstanding_debt() {
    let s = setup();
    seed_liquidity(&s, &[&s.d1], &[10_000]);
    open_position(&s, &s.alice, 2_000, 1_000);
    s.client().repay(&s.alice, &100);
    s.client().withdraw_collateral(&s.alice, &2_000);
}
