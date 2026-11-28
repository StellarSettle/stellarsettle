#![cfg(test)]

use super::*;
use crate::test_common::setup;
use soroban_sdk::testutils::Address as _;

// Note: the contract's succession flow is the two-step nominate_admin /
// accept_admin transfer; it has no enforced wait period, so "premature"
// confirmation is modelled as confirmation by an address that was not nominated
// (or after the nomination was revoked).

#[test]
fn test_succession_happy_path_revokes_old_admin() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let nominee = Address::generate(&t.env);
    client.nominate_admin(&t.buyer, &nominee);
    client.accept_admin(&nominee);
    // Old admin can no longer nominate; new admin can.
    assert!(client.try_nominate_admin(&t.buyer, &t.supplier).is_err());
    let next = Address::generate(&t.env);
    client.nominate_admin(&nominee, &next);
}

#[test]
#[should_panic(expected = "no pending nomination")]
fn test_confirmation_without_nomination_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    client.accept_admin(&Address::generate(&t.env));
}

#[test]
#[should_panic(expected = "unauthorized")]
fn test_confirmation_by_non_nominee_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    client.nominate_admin(&t.buyer, &Address::generate(&t.env));
    client.accept_admin(&Address::generate(&t.env));
}
