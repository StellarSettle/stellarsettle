//! #214 mutual buyer+supplier pre-approval gate tests.
#![cfg(test)]

extern crate std;

use super::*;
use crate::test_common::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Address, BytesN, String, Symbol};

#[test]
#[should_panic]
fn buyer_only_without_supplier_approval_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    client.set_require_mutual_preapproval(&t.buyer, &true);
    let id = String::from_str(&t.env, "VAL-M");
    client.create_shipment(&id, &single_buyer_vec(&t.env, &t.buyer), &t.supplier, &t.logistics, &t.arbiter, &t.token_id, &1_000_000_000, &build_milestones(&t.env), &default_options(&t.env));
}

#[test]
#[should_panic]
fn supplier_approving_other_buyer_only_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    client.set_require_mutual_preapproval(&t.buyer, &true);
    let id = String::from_str(&t.env, "VAL-M");
    client.add_approved_buyer(&t.supplier, &t.buyer2);
    client.create_shipment(&id, &single_buyer_vec(&t.env, &t.buyer), &t.supplier, &t.logistics, &t.arbiter, &t.token_id, &1_000_000_000, &build_milestones(&t.env), &default_options(&t.env));
}

#[test]
fn both_parties_approve_allows_shipment() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    client.set_require_mutual_preapproval(&t.buyer, &true);
    let id = String::from_str(&t.env, "VAL-M");
    client.add_approved_buyer(&t.supplier, &t.buyer);
    client.create_shipment(&id, &single_buyer_vec(&t.env, &t.buyer), &t.supplier, &t.logistics, &t.arbiter, &t.token_id, &1_000_000_000, &build_milestones(&t.env), &default_options(&t.env));
    assert_eq!(client.get_shipment(&id).supplier, t.supplier);
}
