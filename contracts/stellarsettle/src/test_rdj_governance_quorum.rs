#![cfg(test)]

use super::*;
use crate::test_common::setup;
use soroban_sdk::{testutils::Address as _, String, Symbol};

fn configure(t: &crate::test_common::TestSetup, threshold: u32) -> (Address, Address) {
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let a2 = Address::generate(&t.env);
    let a3 = Address::generate(&t.env);
    client.initialize_multisig_admin(
        &t.buyer,
        &soroban_sdk::vec![&t.env, t.buyer.clone(), a2.clone(), a3.clone()],
        &threshold,
    );
    (a2, a3)
}

#[test]
fn test_below_quorum_does_not_execute() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    configure(&t, 2);
    let id = String::from_str(&t.env, "act-1");
    client.propose_admin_action(&t.buyer, &id, &Symbol::new(&t.env, "noop"), &String::from_str(&t.env, ""));
    assert_eq!(client.get_pending_admin_actions(&id).len(), 1);
}

#[test]
fn test_exact_quorum_executes_and_clears_approvals() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let (a2, _) = configure(&t, 2);
    let id = String::from_str(&t.env, "act-2");
    let p = String::from_str(&t.env, "");
    let op = Symbol::new(&t.env, "noop");
    client.propose_admin_action(&t.buyer, &id, &op, &p);
    client.propose_admin_action(&a2, &id, &op, &p);
    assert_eq!(client.get_pending_admin_actions(&id).len(), 0);
}

#[test]
#[should_panic(expected = "already approved by this admin")]
fn test_duplicate_signature_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    configure(&t, 2);
    let id = String::from_str(&t.env, "act-3");
    let p = String::from_str(&t.env, "");
    let op = Symbol::new(&t.env, "noop");
    client.propose_admin_action(&t.buyer, &id, &op, &p);
    client.propose_admin_action(&t.buyer, &id, &op, &p);
}
