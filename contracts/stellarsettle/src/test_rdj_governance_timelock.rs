#![cfg(test)]

use super::*;
use crate::test_common::setup;
use soroban_sdk::{testutils::Ledger as _, Symbol};

#[test]
#[should_panic(expected = "TimelockNotExpired")]
fn test_execute_before_timelock_expires_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    t.env.ledger().set_sequence_number(100);
    client.set_timelock_duration(&t.buyer, &50);
    let param = Symbol::new(&t.env, "max_shipment_value");
    client.propose_param_change(&t.buyer, &param, &5_000_000);
    t.env.ledger().set_sequence_number(120);
    client.execute_param_change(&t.buyer, &param);
}

#[test]
fn test_execute_after_timelock_succeeds() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    t.env.ledger().set_sequence_number(100);
    client.set_timelock_duration(&t.buyer, &50);
    let param = Symbol::new(&t.env, "max_shipment_value");
    client.propose_param_change(&t.buyer, &param, &5_000_000);
    t.env.ledger().set_sequence_number(151);
    client.execute_param_change(&t.buyer, &param);
}
