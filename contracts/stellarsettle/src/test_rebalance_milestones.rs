#![cfg(test)]

extern crate std;

use super::*;
use crate::test_common::{create_standard_shipment, setup};
use soroban_sdk::{
    testutils::Events as _, vec, Address, String, Symbol, TryFromVal, TryIntoVal,
};

fn sid(env: &soroban_sdk::Env, id: &str) -> String {
    String::from_str(env, id)
}

fn proof_hash(env: &soroban_sdk::Env) -> soroban_sdk::String {
    soroban_sdk::String::from_str(env, "QmXyz123")
}

fn proof_type(env: &soroban_sdk::Env) -> Symbol {
    Symbol::new(env, "ipfs")
}

// ============================================================
// #252: coverage for rebalance_milestones
// ============================================================

#[test]
fn test_rebalance_before_any_proof_submission_succeeds() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let ship_id = sid(&t.env, "ship1");
    create_standard_shipment(
        &client,
        &t.env,
        &ship_id,
        &t.buyer,
        &t.supplier,
        &t.logistics,
        &t.arbiter,
        &t.token_id,
        1_000_000,
    );

    let new_percents = vec![&t.env, 10u32, 10u32, 80u32];
    client.rebalance_milestones(&t.buyer, &ship_id, &new_percents);

    let shipment = client.get_shipment(&ship_id);
    assert_eq!(shipment.milestones.get(0).unwrap().payment_percent, 10);
    assert_eq!(shipment.milestones.get(1).unwrap().payment_percent, 10);
    assert_eq!(shipment.milestones.get(2).unwrap().payment_percent, 80);
}

#[test]
fn test_rebalance_emits_event_with_old_and_new_weights() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let ship_id = sid(&t.env, "ship-rebalance-event");
    create_standard_shipment(
        &client,
        &t.env,
        &ship_id,
        &t.buyer,
        &t.supplier,
        &t.logistics,
        &t.arbiter,
        &t.token_id,
        1_000_000,
    );

    let new_percents = vec![&t.env, 10u32, 10u32, 80u32];
    client.rebalance_milestones(&t.buyer, &ship_id, &new_percents);

    let events = t.env.events().all();
    assert_eq!(events.len(), 1, "rebalance should emit one contract event");
    let (contract_id, topics, data) = events.get(0).unwrap();
    assert_eq!(contract_id, t.contract_id);
    assert_eq!(topics.len(), 2);
    assert_eq!(
        Symbol::try_from_val(&t.env, &topics.get(0).unwrap()).unwrap(),
        Symbol::new(&t.env, "milestones_rebalanced")
    );
    assert_eq!(
        String::try_from_val(&t.env, &topics.get(1).unwrap()).unwrap(),
        ship_id
    );

    let (buyer, old_percents, emitted_new_percents): (Address, Vec<u32>, Vec<u32>) =
        data.try_into_val(&t.env).unwrap();
    assert_eq!(buyer, t.buyer);
    assert_eq!(old_percents, vec![&t.env, 25u32, 50u32, 25u32]);
    assert_eq!(emitted_new_percents, new_percents);
}

#[test]
#[should_panic(expected = "cannot rebalance: at least one milestone is no longer pending")]
fn test_rebalance_rejected_after_milestone_progressed() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let ship_id = sid(&t.env, "ship1");
    create_standard_shipment(
        &client,
        &t.env,
        &ship_id,
        &t.buyer,
        &t.supplier,
        &t.logistics,
        &t.arbiter,
        &t.token_id,
        1_000_000,
    );

    // Progress milestone 0 past Pending by submitting proof.
    client.submit_proof(
        &t.supplier,
        &ship_id,
        &0u32,
        &proof_hash(&t.env),
        &proof_type(&t.env),
    );

    let new_percents = vec![&t.env, 10u32, 10u32, 80u32];
    client.rebalance_milestones(&t.buyer, &ship_id, &new_percents);
}

#[test]
fn test_rebalance_percentages_still_sum_to_100() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let ship_id = sid(&t.env, "ship1");
    create_standard_shipment(
        &client,
        &t.env,
        &ship_id,
        &t.buyer,
        &t.supplier,
        &t.logistics,
        &t.arbiter,
        &t.token_id,
        1_000_000,
    );

    let new_percents = vec![&t.env, 33u32, 33u32, 34u32];
    client.rebalance_milestones(&t.buyer, &ship_id, &new_percents);

    let shipment = client.get_shipment(&ship_id);
    let mut sum: u32 = 0;
    for i in 0..shipment.milestones.len() {
        sum += shipment.milestones.get(i).unwrap().payment_percent;
    }
    assert_eq!(sum, 100);
}

#[test]
#[should_panic(expected = "milestone percentages must sum to 100")]
fn test_rebalance_rejected_when_sum_not_100() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let ship_id = sid(&t.env, "ship1");
    create_standard_shipment(
        &client,
        &t.env,
        &ship_id,
        &t.buyer,
        &t.supplier,
        &t.logistics,
        &t.arbiter,
        &t.token_id,
        1_000_000,
    );

    let new_percents = vec![&t.env, 10u32, 10u32, 70u32];
    client.rebalance_milestones(&t.buyer, &ship_id, &new_percents);
}

#[test]
#[should_panic(expected = "milestone percentages must sum to 100")]
fn test_rebalance_rejected_when_unequal_weights_do_not_sum_to_100() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let ship_id = sid(&t.env, "ship1");
    create_standard_shipment(
        &client,
        &t.env,
        &ship_id,
        &t.buyer,
        &t.supplier,
        &t.logistics,
        &t.arbiter,
        &t.token_id,
        1_000_000,
    );

    // Unequal weights that total 110 instead of 100.
    let new_percents = vec![&t.env, 50u32, 50u32, 10u32];
    client.rebalance_milestones(&t.buyer, &ship_id, &new_percents);
}

#[test]
fn test_rebalance_single_milestone_shipment() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let ship_id = sid(&t.env, "ship1");
    create_standard_shipment(
        &client,
        &t.env,
        &ship_id,
        &t.buyer,
        &t.supplier,
        &t.logistics,
        &t.arbiter,
        &t.token_id,
        1_000_000,
    );

    let new_percents = vec![&t.env, 100u32];
    client.rebalance_milestones(&t.buyer, &ship_id, &new_percents);

    let shipment = client.get_shipment(&ship_id);
    assert_eq!(shipment.milestones.len(), 1);
    assert_eq!(shipment.milestones.get(0).unwrap().payment_percent, 100);
}

#[test]
#[should_panic(expected = "cannot rebalance: at least one milestone is no longer pending")]
fn test_rebalance_rejected_after_milestone_released() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let ship_id = sid(&t.env, "ship1");
    create_standard_shipment(
        &client,
        &t.env,
        &ship_id,
        &t.buyer,
        &t.supplier,
        &t.logistics,
        &t.arbiter,
        &t.token_id,
        1_000_000,
    );

    // Confirm milestone 0 so it is no longer pending.
    client.confirm_milestone(&t.buyer, &ship_id, &0u32);

    let new_percents = vec![&t.env, 10u32, 10u32, 80u32];
    client.rebalance_milestones(&t.buyer, &ship_id, &new_percents);
}

#[test]
#[should_panic(expected = "unauthorized")]
fn test_rebalance_rejected_for_non_buyer_caller() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let ship_id = sid(&t.env, "ship1");
    create_standard_shipment(
        &client,
        &t.env,
        &ship_id,
        &t.buyer,
        &t.supplier,
        &t.logistics,
        &t.arbiter,
        &t.token_id,
        1_000_000,
    );

    let new_percents = vec![&t.env, 10u32, 10u32, 80u32];
    client.rebalance_milestones(&t.supplier, &ship_id, &new_percents);
}
