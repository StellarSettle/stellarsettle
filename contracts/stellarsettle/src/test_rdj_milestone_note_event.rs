#![cfg(test)]

use super::*;
use crate::test_common::{create_standard_shipment, setup};
use soroban_sdk::{testutils::Events as _, String, Symbol, TryFromVal};

#[test]
fn test_milestone_note_added_event_emitted_with_hash() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let sid = String::from_str(&t.env, "RDJ-NOTE-1");
    create_standard_shipment(
        &client, &t.env, &sid, &t.buyer, &t.supplier, &t.logistics, &t.arbiter, &t.token_id,
        1_000_000,
    );
    let note = String::from_str(&t.env, "pallet inspected");
    client.add_milestone_note(&t.buyer, &sid, &0, &note);

    let topic = Symbol::new(&t.env, "milestone_note_added");
    let found = t.env.events().all().iter().any(|(_, topics, _)| {
        topics
            .get(0)
            .map(|v| Symbol::try_from_val(&t.env, &v).map(|s| s == topic).unwrap_or(false))
            .unwrap_or(false)
    });
    assert!(found, "milestone_note_added event must be emitted");
}
