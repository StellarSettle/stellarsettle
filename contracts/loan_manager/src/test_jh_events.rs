#![cfg(test)]

extern crate std;

// #225: verify the loan_manager state-change events and their data.
// Event names in the contract: borrowed (LoanOpened), repaid (LoanRepaid),
// collateral_added (CollateralDeposited), liquidated (PositionLiquidated).

use crate::test::test_common::{open_position, seed_liquidity, setup, Setup};
use soroban_sdk::testutils::Events as _;
use soroban_sdk::{vec, IntoVal, Symbol, Val};

fn has_event<D: IntoVal<soroban_sdk::Env, Val>>(s: &Setup, name: &str, data: D) -> bool {
    let expected = vec![
        &s.env,
        (
            s.id.clone(),
            (Symbol::new(&s.env, name),).into_val(&s.env),
            data.into_val(&s.env),
        ),
    ];
    // Soroban Vec equality compares by value through the host.
    s.env
        .events()
        .all()
        .iter()
        .any(|e| vec![&s.env, e] == expected)
}

#[test]
fn test_deposit_collateral_and_borrow_emit_events() {
    let s = setup();
    seed_liquidity(&s, &[&s.d1], &[10_000]);
    open_position(&s, &s.alice, 2_000, 1_000);
    assert!(has_event(&s, "collateral_added", (s.alice.clone(), 2_000i128)));
    assert!(has_event(&s, "borrowed", (s.alice.clone(), 1_000i128)));
}

#[test]
fn test_repay_emits_event() {
    let s = setup();
    seed_liquidity(&s, &[&s.d1], &[10_000]);
    open_position(&s, &s.alice, 2_000, 1_000);
    s.client().repay(&s.alice, &400);
    assert!(has_event(&s, "repaid", (s.alice.clone(), 400i128)));
}

#[test]
fn test_liquidation_emits_event() {
    let s = setup();
    seed_liquidity(&s, &[&s.d1], &[10_000]);
    open_position(&s, &s.alice, 2_000, 1_000);
    s.primary_oracle().set_price(&s.coll_id, &50_000_000);
    let r = s.client().liquidate(&s.bob, &s.alice, &0i128);
    assert!(has_event(
        &s,
        "liquidated",
        (s.alice.clone(), s.bob.clone(), r.repay_units, r.seize_units, r.bonus_bps)
    ));
}
