#![cfg(test)]

extern crate std;

use super::*;
use crate::test_common::{create_standard_shipment, setup, TestSetup};
use proptest::prelude::*;
use proptest::test_runner::{Config, TestRunner};
use soroban_sdk::{testutils::Address as _, Address, String, Vec};

fn create_test_shipment(t: &TestSetup, shipment_id: &String) {
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

fn make_payees(
    env: &Env,
    addresses: &[Address],
    input: &[(u8, u32)],
) -> Vec<MilestonePayee> {
    let mut payees = Vec::new(env);
    for (address_index, percent) in input {
        payees.push_back(MilestonePayee {
            payee: addresses[*address_index as usize].clone(),
            percent: *percent,
        });
    }
    payees
}

fn is_valid_split(input: &[(u8, u32)]) -> bool {
    if input.is_empty() {
        return true;
    }

    let mut total = 0u32;
    for (index, (address, percent)) in input.iter().enumerate() {
        if *percent == 0
            || input[..index]
                .iter()
                .any(|(previous_address, _)| previous_address == address)
        {
            return false;
        }
        let Some(next_total) = total.checked_add(*percent) else {
            return false;
        };
        total = next_total;
    }
    total == 100
}

fn random_split_strategy() -> impl Strategy<Value = std::vec::Vec<(u8, u32)>> {
    let arbitrary = prop::collection::vec((0u8..6, any::<u32>()), 0..=10);
    let valid = prop::sample::subsequence(1u32..100, 0..=5).prop_map(|cuts| {
        let mut previous = 0;
        let mut split = std::vec::Vec::with_capacity(cuts.len() + 1);
        for (index, cut) in cuts.iter().enumerate() {
            split.push((index as u8, *cut - previous));
            previous = *cut;
        }
        split.push((cuts.len() as u8, 100 - previous));
        split
    });
    prop_oneof![arbitrary, valid]
}

#[test]
fn fuzz_payee_split_inputs_do_not_panic_and_only_accept_valid_splits() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let shipment_id = String::from_str(&t.env, "PAYEE-SPLIT-FUZZ");
    create_test_shipment(&t, &shipment_id);
    let addresses: [Address; 6] = std::array::from_fn(|_| Address::generate(&t.env));
    let mut runner = TestRunner::new(Config {
        cases: 10_000,
        ..Config::default()
    });

    runner
        .run(&random_split_strategy(), |input| {
            let expected_valid = is_valid_split(input);
            let payees = make_payees(&t.env, &addresses, input);
            let result = client.try_set_milestone_payees(&t.buyer, &shipment_id, &0, &payees);
            prop_assert_eq!(result.is_ok(), expected_valid);
            Ok(())
        })
        .expect("10,000 randomized payee split inputs should complete without panicking");
}

#[test]
fn zero_weight_payee_is_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let shipment_id = String::from_str(&t.env, "PAYEE-SPLIT-ZERO");
    create_test_shipment(&t, &shipment_id);
    let payees = soroban_sdk::vec![
        &t.env,
        MilestonePayee {
            payee: Address::generate(&t.env),
            percent: 0,
        },
        MilestonePayee {
            payee: Address::generate(&t.env),
            percent: 100,
        },
    ];

    assert!(client
        .try_set_milestone_payees(&t.buyer, &shipment_id, &0, &payees)
        .is_err());
}

#[test]
fn duplicate_payee_address_is_rejected() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let shipment_id = String::from_str(&t.env, "PAYEE-SPLIT-DUPLICATE");
    create_test_shipment(&t, &shipment_id);
    let address = Address::generate(&t.env);
    let payees = soroban_sdk::vec![
        &t.env,
        MilestonePayee {
            payee: address.clone(),
            percent: 40,
        },
        MilestonePayee {
            payee: address,
            percent: 60,
        },
    ];

    assert!(client
        .try_set_milestone_payees(&t.buyer, &shipment_id, &0, &payees)
        .is_err());
}

#[test]
fn valid_payee_split_is_accepted() {
    let t = setup();
    let client = StellarSettleContractClient::new(&t.env, &t.contract_id);
    let shipment_id = String::from_str(&t.env, "PAYEE-SPLIT-VALID");
    create_test_shipment(&t, &shipment_id);
    let payees = soroban_sdk::vec![
        &t.env,
        MilestonePayee {
            payee: Address::generate(&t.env),
            percent: 25,
        },
        MilestonePayee {
            payee: Address::generate(&t.env),
            percent: 75,
        },
    ];

    client.set_milestone_payees(&t.buyer, &shipment_id, &0, &payees);
    let stored = client.get_milestone_payees(&shipment_id, &0);
    assert_eq!(stored.len(), 2);
    assert_eq!(stored.get(0).unwrap().percent, 25);
    assert_eq!(stored.get(1).unwrap().percent, 75);
}
