// #220: creating a shipment with a token outside the allowed list is rejected.
// Enforcement lives in `create_shipment` ("token is not in the approved whitelist").

extern crate stellarsettle;
use soroban_sdk::{testutils::Address as _, token, vec, Address, Env, String};
use stellarsettle::*;

fn options(env: &Env) -> ShipmentOptions {
    ShipmentOptions {
        response_deadline: 0,
        penalty_bps: 0,
        milestone_mode: MilestoneMode::Parallel,
        holdback_ledgers: 0,
        dispute_cooldown_ledgers: 0,
        late_penalty_bps_per_ledger: 0,
        auto_confirm_ledgers: 0,
        dispute_bond_amount: 0,
        dispute_bond_bps: 0,
        arbiter_fee_bps: 0,
        logistics_fee_bps: 0,
        supplier_collateral: 0,
        expires_at_ledger: None,
        metadata_hash: None,
        referrer: None,
        buyer_cancel_fee_bps: 0,
        early_bonus_pool: 0,
        review_window_ledgers: None,
        milestone_splits: vec![env],
        deadlines: vec![env],
        dispute_timeout_seconds: 0,
        default_resolution: Resolution::Buyer,
        backup_arbiter: None,
        confirmation_cooldown_ledgers: None,
        arbiter_panel: vec![env],
        grace_period_ledgers: 0,
        jurisdiction: None,
        quality_grades: vec![env],
        milestone_quantities: vec![env],
        retainage_bps: 0,
        warranty_bps: 0,
        warranty_ledgers: 0,
        inspector: None,
        inspected_milestones: vec![env],
        proof_submitters: vec![env],
        require_dual_attestation: false,
        fund_from_vault: false,
        milestone_suppliers: vec![env],
        refund_recipient: None,
    }
}

fn milestones(env: &Env) -> soroban_sdk::Vec<Milestone> {
    vec![
        env,
        Milestone {
            name: String::from_str(env, "Delivered"),
            payment_percent: 100,
            proof_hash: String::from_str(env, ""),
            status: MilestoneStatus::Pending,
            release_after_ledger: 0,
            proof_submitted_ledger: None,
            dispute_opened_ledger: None,
            deadline_ledger: 0,
            penalty_bps_per_ledger: 0,
        },
    ]
}

fn setup(env: &Env) -> (StellarSettleContractClient<'_>, Address, Address) {
    env.mock_all_auths();
    let contract_id = env.register(StellarSettleContract, ());
    let token_id = env
        .register_stellar_asset_contract_v2(Address::generate(env))
        .address();
    let buyer = Address::generate(env);
    token::StellarAssetClient::new(env, &token_id).mint(&buyer, &1_000_000);
    let client = StellarSettleContractClient::new(env, &contract_id);
    client.init(&buyer);
    (client, buyer, token_id)
}

#[test]
#[should_panic(expected = "token is not in the approved whitelist")]
fn test_create_shipment_with_unlisted_token_rejected() {
    let env = Env::default();
    let (client, buyer, token_id) = setup(&env);
    let other_token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    client.add_allowed_token(&other_token);
    assert!(!client.get_allowed_tokens().contains(&token_id));

    client.create_shipment(
        &String::from_str(&env, "TOK-1"),
        &vec![&env, buyer],
        &Address::generate(&env),
        &Address::generate(&env),
        &Address::generate(&env),
        &token_id,
        &1_000,
        &milestones(&env),
        &options(&env),
    );
}
