//! #211 dispute evidence submission validation tests.
#![cfg(test)]

extern crate std;

use super::*;
use crate::test_common::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Address, BytesN, String, Symbol};

#[test]
#[should_panic]
fn evidence_empty_hash_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let id = String::from_str(&t.env, "VAL-D");
    create_standard_shipment(&client, &t.env, &id, &t.buyer, &t.supplier, &t.logistics, &t.arbiter, &t.token_id, 1_000_000_000);
    client.submit_proof(&t.supplier, &id, &0, &String::from_str(&t.env, "ipfs://proof"), &Symbol::new(&t.env, "ipfs"));
    client.raise_dispute(&t.buyer, &id, &0);
    client.submit_dispute_evidence(&t.supplier, &id, &0, &String::from_str(&t.env, ""), &Symbol::new(&t.env, "doc"));
}

#[test]
#[should_panic]
fn evidence_after_dispute_resolved_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let id = String::from_str(&t.env, "VAL-D");
    create_standard_shipment(&client, &t.env, &id, &t.buyer, &t.supplier, &t.logistics, &t.arbiter, &t.token_id, 1_000_000_000);
    client.submit_proof(&t.supplier, &id, &0, &String::from_str(&t.env, "ipfs://proof"), &Symbol::new(&t.env, "ipfs"));
    client.raise_dispute(&t.buyer, &id, &0);
    client.resolve_dispute(&t.arbiter, &id, &0u32, &false, &None);
    client.submit_dispute_evidence(&t.supplier, &id, &0, &String::from_str(&t.env, "ipfs://late"), &Symbol::new(&t.env, "doc"));
}

#[test]
#[should_panic]
fn evidence_from_non_party_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let id = String::from_str(&t.env, "VAL-D");
    create_standard_shipment(&client, &t.env, &id, &t.buyer, &t.supplier, &t.logistics, &t.arbiter, &t.token_id, 1_000_000_000);
    client.submit_proof(&t.supplier, &id, &0, &String::from_str(&t.env, "ipfs://proof"), &Symbol::new(&t.env, "ipfs"));
    client.raise_dispute(&t.buyer, &id, &0);
    let stranger = Address::generate(&t.env);
    client.submit_dispute_evidence(&stranger, &id, &0, &String::from_str(&t.env, "ipfs://x"), &Symbol::new(&t.env, "doc"));
}
