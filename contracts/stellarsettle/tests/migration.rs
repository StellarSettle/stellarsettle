// #219: shipment state must survive a contract upgrade / migration.
// Note: the native test env cannot swap in a second WASM, so the "N+1" step
// is stubbed by calling `migrate()` (the post-upgrade entrypoint) on the same
// instance, which bumps the storage schema version.

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
fn test_shipment_survives_migration() {
    let env = Env::default();
    let (client, buyer, token_id) = setup(&env);
    let id = String::from_str(&env, "MIG-1");
    client.create_shipment(
        &id,
        &vec![&env, buyer],
        &Address::generate(&env),
        &Address::generate(&env),
        &Address::generate(&env),
        &token_id,
        &1_000,
        &milestones(&env),
        &options(&env),
    );
    assert_eq!(client.storage_schema_version(), 0);
    let before = client.get_shipment(&id);

    client.migrate();

    assert_eq!(client.storage_schema_version(), stellarsettle::constants::STORAGE_SCHEMA_VERSION);
    let after = client.get_shipment(&id);
    assert_eq!(before, after);
}
