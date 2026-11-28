#![cfg(test)]

extern crate std;

use super::*;
use crate::test_common::{create_standard_shipment, setup, TestSetup};
use soroban_sdk::{token, String, Symbol};

fn create_advance_shipment(t: &TestSetup, shipment_id: &String) {
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    create_standard_shipment(
        &client,
        &t.env,
        shipment_id,
        &t.buyer,
        &t.supplier,
        &t.logistics,
        &t.arbiter,
        &t.token_id,
        1_000_000_000,
    );
}

#[test]
fn test_advance_request_remains_pending_until_approved() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let token_client = token::Client::new(&t.env, &t.token_id);
    let shipment_id = String::from_str(&t.env, "advance-request-pending");
    create_advance_shipment(&t, &shipment_id);

    client.request_advance(&t.supplier, &shipment_id, &0, &20);

    let request: AdvanceRequest = t
        .env
        .storage()
        .persistent()
        .get(&DataKey::AdvanceRequest(shipment_id, 0))
        .unwrap();
    assert_eq!(request.requested_percent, 20);
    assert!(!request.approved);
    assert_eq!(request.amount_advanced, 0);
    assert_eq!(token_client.balance(&t.supplier), 0);
}

#[test]
fn test_advance_approval_disburses_and_updates_escrow_accounting() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let token_client = token::Client::new(&t.env, &t.token_id);
    let shipment_id = String::from_str(&t.env, "advance-approved-disbursed");
    create_advance_shipment(&t, &shipment_id);
    client.request_advance(&t.supplier, &shipment_id, &0, &20);

    client.approve_advance(&t.buyer, &shipment_id, &0);

    let advance_amount = 50_000_000;
    let request: AdvanceRequest = t
        .env
        .storage()
        .persistent()
        .get(&DataKey::AdvanceRequest(shipment_id.clone(), 0))
        .unwrap();
    assert!(request.approved);
    assert_eq!(request.amount_advanced, advance_amount);
    assert_eq!(token_client.balance(&t.supplier), advance_amount);
    assert_eq!(
        token_client.balance(&t.contract_id),
        1_000_000_000 - advance_amount
    );
    assert_eq!(
        client.get_shipment(&shipment_id).total_advanced_amount,
        advance_amount
    );
}

#[test]
fn test_advance_request_above_contract_maximum_is_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let shipment_id = String::from_str(&t.env, "advance-request-over-max");
    create_advance_shipment(&t, &shipment_id);

    assert!(client
        .try_request_advance(&t.supplier, &shipment_id, &0, &31)
        .is_err());
    assert!(!t
        .env
        .storage()
        .persistent()
        .has(&DataKey::AdvanceRequest(shipment_id, 0)));
}

#[test]
fn test_advance_request_is_rejected_for_disputed_milestone() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let shipment_id = String::from_str(&t.env, "advance-request-disputed");
    create_advance_shipment(&t, &shipment_id);
    client.submit_proof(
        &t.supplier,
        &shipment_id,
        &0,
        &String::from_str(&t.env, "proof"),
        &Symbol::new(&t.env, "ipfs"),
    );
    client.raise_dispute(&t.buyer, &shipment_id, &0);

    assert!(client
        .try_request_advance(&t.supplier, &shipment_id, &0, &20)
        .is_err());
    assert!(!t
        .env
        .storage()
        .persistent()
        .has(&DataKey::AdvanceRequest(shipment_id, 0)));
}

#[test]
fn test_pending_advance_cannot_be_approved_after_milestone_is_disputed() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let token_client = token::Client::new(&t.env, &t.token_id);
    let shipment_id = String::from_str(&t.env, "advance-approval-disputed");
    create_advance_shipment(&t, &shipment_id);
    client.request_advance(&t.supplier, &shipment_id, &0, &20);
    client.submit_proof(
        &t.supplier,
        &shipment_id,
        &0,
        &String::from_str(&t.env, "proof"),
        &Symbol::new(&t.env, "ipfs"),
    );
    client.raise_dispute(&t.buyer, &shipment_id, &0);

    assert!(client
        .try_approve_advance(&t.buyer, &shipment_id, &0)
        .is_err());

    let request: AdvanceRequest = t
        .env
        .storage()
        .persistent()
        .get(&DataKey::AdvanceRequest(shipment_id.clone(), 0))
        .unwrap();
    assert!(!request.approved);
    assert_eq!(request.amount_advanced, 0);
    assert_eq!(token_client.balance(&t.supplier), 0);
    assert_eq!(client.get_shipment(&shipment_id).total_advanced_amount, 0);
    assert_eq!(
        client.get_milestone(&shipment_id, &0).status,
        MilestoneStatus::Disputed
    );
}

#[test]
fn test_advance_cannot_be_approved_twice() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let token_client = token::Client::new(&t.env, &t.token_id);
    let shipment_id = String::from_str(&t.env, "advance-duplicate-approval");
    create_advance_shipment(&t, &shipment_id);
    client.request_advance(&t.supplier, &shipment_id, &0, &20);
    client.approve_advance(&t.buyer, &shipment_id, &0);
    let supplier_balance_after_approval = token_client.balance(&t.supplier);

    assert!(client
        .try_approve_advance(&t.buyer, &shipment_id, &0)
        .is_err());
    assert_eq!(
        token_client.balance(&t.supplier),
        supplier_balance_after_approval
    );
    assert_eq!(
        client.get_shipment(&shipment_id).total_advanced_amount,
        supplier_balance_after_approval
    );
}
