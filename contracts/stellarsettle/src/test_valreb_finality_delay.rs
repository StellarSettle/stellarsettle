//! #212 resolution finality delay enforcement tests.
#![cfg(test)]

extern crate std;

use super::*;
use crate::test_common::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Address, BytesN, String, Symbol};

#[test]
fn supplier_ruling_parks_milestone_until_delay_elapses() {
    let t = setup();
    let delay = 10u32;
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let id = String::from_str(&t.env, "VAL-D");
    create_standard_shipment(&client, &t.env, &id, &t.buyer, &t.supplier, &t.logistics, &t.arbiter, &t.token_id, 1_000_000_000);
    client.submit_proof(&t.supplier, &id, &0, &String::from_str(&t.env, "ipfs://proof"), &Symbol::new(&t.env, "ipfs"));
    client.raise_dispute(&t.buyer, &id, &0);
    client.set_finality_delay_ledgers(&t.buyer, &delay);
    client.resolve_dispute(&t.arbiter, &id, &0u32, &true, &None);
    let m = client.get_shipment(&id).milestones.get(0).unwrap();
    assert_eq!(m.status, MilestoneStatus::ResolvedPendingFinality);
    t.env.ledger().with_mut(|l| l.sequence_number += delay + 1);
    client.finalize_dispute_resolution(&id, &0u32);
    let m = client.get_shipment(&id).milestones.get(0).unwrap();
    assert!(m.status != MilestoneStatus::ResolvedPendingFinality);
}

#[test]
#[should_panic]
fn finalize_before_delay_elapsed_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let id = String::from_str(&t.env, "VAL-D");
    create_standard_shipment(&client, &t.env, &id, &t.buyer, &t.supplier, &t.logistics, &t.arbiter, &t.token_id, 1_000_000_000);
    client.submit_proof(&t.supplier, &id, &0, &String::from_str(&t.env, "ipfs://proof"), &Symbol::new(&t.env, "ipfs"));
    client.raise_dispute(&t.buyer, &id, &0);
    client.set_finality_delay_ledgers(&t.buyer, &10u32);
    client.resolve_dispute(&t.arbiter, &id, &0u32, &true, &None);
    client.finalize_dispute_resolution(&id, &0u32);
}
