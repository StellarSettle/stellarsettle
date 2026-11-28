//! #213 blacklist appeal process tests.
#![cfg(test)]

extern crate std;

use super::*;
use crate::test_common::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Address, BytesN, String, Symbol};

fn blacklist(t: &TestSetup, who: &Address) {
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    client.blacklist_address(&t.buyer, who, &BytesN::from_array(&t.env, &[1u8; 32]));
}

#[test]
fn blacklisted_address_can_appeal_and_admin_approves() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    blacklist(&t, &t.supplier);
    client.appeal_blacklist(&t.supplier, &String::from_str(&t.env, "ipfs://appeal"));
    let a = client.get_blacklist_appeal(&t.supplier).unwrap();
    assert_eq!(a.status, BlacklistAppealStatus::Pending);
    client.review_blacklist_appeal(&t.buyer, &t.supplier, &true);
    assert_eq!(client.get_blacklist_appeal(&t.supplier).unwrap().status, BlacklistAppealStatus::Approved);
    assert!(!client.is_blacklisted(&t.supplier));
}

#[test]
#[should_panic]
fn non_blacklisted_cannot_appeal() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    client.appeal_blacklist(&t.supplier, &String::from_str(&t.env, "ipfs://appeal"));
}

#[test]
#[should_panic]
fn duplicate_pending_appeal_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    blacklist(&t, &t.supplier);
    client.appeal_blacklist(&t.supplier, &String::from_str(&t.env, "a"));
    client.appeal_blacklist(&t.supplier, &String::from_str(&t.env, "b"));
}

#[test]
fn rejected_appeal_keeps_blacklist() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    blacklist(&t, &t.supplier);
    client.appeal_blacklist(&t.supplier, &String::from_str(&t.env, "a"));
    client.review_blacklist_appeal(&t.buyer, &t.supplier, &false);
    assert!(client.is_blacklisted(&t.supplier));
}
