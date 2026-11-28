// #209: Verify supplier cancel cooldown enforcement in contract tests.
// Tests cover:
// • Verify cancel is rejected within the cooldown window
// • Verify cancel succeeds after the cooldown expires
// • Verify cooldown resets correctly on re-attempt

extern crate stellarsettle;
use soroban_sdk::{testutils::Address as _, token, vec, Address, Env, String, Symbol};
use stellarsettle::*;

struct TestEnv {
    env: Env,
    client: StellarSettleContractClient<'static>,
    admin: Address,
    buyer: Address,
    supplier: Address,
    logistics: Address,
    arbiter: Address,
    token_id: Address,
}

fn options(env: &Env, response_deadline: u32) -> ShipmentOptions {
    ShipmentOptions {
        response_deadline,
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

fn setup() -> TestEnv {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StellarSettleContract, ());
    let token_id = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();

    let admin = Address::generate(&env);
    let buyer = Address::generate(&env);
    let supplier = Address::generate(&env);
    let logistics = Address::generate(&env);
    let arbiter = Address::generate(&env);

    token::StellarAssetClient::new(&env, &token_id).mint(&buyer, &100_000_000_000);

    let client = StellarSettleContractClient::new(&env, &contract_id);
    client.init(&admin);

    TestEnv {
        env,
        client,
        admin,
        buyer,
        supplier,
        logistics,
        arbiter,
        token_id,
    }
}

fn create_shipment_and_submit_proof(t: &TestEnv, sid_str: &str, deadline: u32) -> String {
    let shipment_id = String::from_str(&t.env, sid_str);
    let milestones = vec![
        &t.env,
        Milestone {
            name: String::from_str(&t.env, "Milestone 1"),
            payment_percent: 100,
            proof_hash: String::from_str(&t.env, ""),
            status: MilestoneStatus::Pending,
            release_after_ledger: 0,
            proof_submitted_ledger: None,
            dispute_opened_ledger: None,
            deadline_ledger: 0,
            penalty_bps_per_ledger: 0,
        },
    ];

    t.client.create_shipment(
        &shipment_id,
        &vec![&t.env, t.buyer.clone()],
        &t.supplier,
        &t.logistics,
        &t.arbiter,
        &t.token_id,
        &1_000_000,
        &milestones,
        &options(&t.env, deadline),
    );

    t.client.submit_proof(
        &t.supplier,
        &shipment_id,
        &0,
        &String::from_str(&t.env, "ipfs://proof"),
        &Symbol::new(&t.env, "ipfs"),
    );

    shipment_id
}

#[test]
fn test_configure_supplier_cancel_cooldown() {
    let t = setup();

    // Verify initial state has no cooldown configured
    assert_eq!(t.client.get_supplier_cancel_cooldown(&t.supplier), None);

    // Admin sets cooldown: max 2 cancellations per 1000 ledgers, 500 cooldown ledgers
    t.client
        .set_supplier_cancel_cooldown(&t.admin, &t.supplier, &2, &1000, &500);

    assert_eq!(
        t.client.get_supplier_cancel_cooldown(&t.supplier),
        Some((2, 1000, 500))
    );

    // Non-admin cannot set cooldown
    let imposter = Address::generate(&t.env);
    assert!(t
        .client
        .try_set_supplier_cancel_cooldown(&imposter, &t.supplier, &1, &500, &200)
        .is_err());
}

#[test]
fn test_supplier_cancel_cooldown_rejected_within_cooldown_window() {
    let t = setup();

    // Allow 1 cancellation per 1000 ledgers, with a 500-ledger cooldown when cap is exceeded
    t.client
        .set_supplier_cancel_cooldown(&t.admin, &t.supplier, &1, &1000, &500);

    t.env.ledger().set_sequence_number(10);
    let sid1 = create_shipment_and_submit_proof(&t, "SHIP-COOLDOWN-1", 50);

    // Advance past buyer deadline (10 + 50 = 60)
    t.env.ledger().set_sequence_number(65);

    // First cancel succeeds (count: 1 <= 1)
    t.client.supplier_cancel(&t.supplier, &sid1);
    assert_eq!(
        t.client.get_shipment(&sid1).status,
        ShipmentStatus::Cancelled
    );

    // Create a second shipment and attempt second cancellation within rolling window
    t.env.ledger().set_sequence_number(100);
    let sid2 = create_shipment_and_submit_proof(&t, "SHIP-COOLDOWN-2", 50);

    // Advance past deadline (100 + 50 = 150)
    t.env.ledger().set_sequence_number(160);

    // Second cancel hits the cap (count becomes 2 > 1) -> triggers cooldown until 160 + 500 = 660
    assert!(t.client.try_supplier_cancel(&t.supplier, &sid2).is_err());
    assert_eq!(t.client.get_shipment(&sid2).status, ShipmentStatus::Active);

    // Attempt within cooldown window at ledger 300 (< 660) -> must still be rejected
    t.env.ledger().set_sequence_number(300);
    assert!(t.client.try_supplier_cancel(&t.supplier, &sid2).is_err());
    assert_eq!(t.client.get_shipment(&sid2).status, ShipmentStatus::Active);

    // Attempt at ledger 659 (< 660) -> still within cooldown window, must be rejected
    t.env.ledger().set_sequence_number(659);
    assert!(t.client.try_supplier_cancel(&t.supplier, &sid2).is_err());
    assert_eq!(t.client.get_shipment(&sid2).status, ShipmentStatus::Active);
}

#[test]
fn test_supplier_cancel_succeeds_after_cooldown_expires() {
    let t = setup();

    // Configure cap of 1 cancellation per 1000 ledgers, 500 ledgers cooldown
    t.client
        .set_supplier_cancel_cooldown(&t.admin, &t.supplier, &1, &1000, &500);

    t.env.ledger().set_sequence_number(100);
    let sid1 = create_shipment_and_submit_proof(&t, "SHIP-EXP-1", 50);

    t.env.ledger().set_sequence_number(160);
    t.client.supplier_cancel(&t.supplier, &sid1);
    assert_eq!(
        t.client.get_shipment(&sid1).status,
        ShipmentStatus::Cancelled
    );

    // Second shipment triggers cooldown at ledger 250 (cooldown until 250 + 500 = 750)
    t.env.ledger().set_sequence_number(200);
    let sid2 = create_shipment_and_submit_proof(&t, "SHIP-EXP-2", 40);

    t.env.ledger().set_sequence_number(250);
    assert!(t.client.try_supplier_cancel(&t.supplier, &sid2).is_err());

    // Advance ledger past cooldown (750) and past window (160 + 1000 = 1160)
    t.env.ledger().set_sequence_number(1200);

    // Cancel succeeds after cooldown and window have rolled over
    t.client.supplier_cancel(&t.supplier, &sid2);
    assert_eq!(
        t.client.get_shipment(&sid2).status,
        ShipmentStatus::Cancelled
    );
}

#[test]
fn test_supplier_cancel_cooldown_resets_correctly_on_reattempt() {
    let t = setup();

    // Cap of 1 cancellation, window 1000, cooldown 400
    t.client
        .set_supplier_cancel_cooldown(&t.admin, &t.supplier, &1, &1000, &400);

    // Cycle 1: First cancel at ledger 100 succeeds
    t.env.ledger().set_sequence_number(50);
    let sid1 = create_shipment_and_submit_proof(&t, "CYCLE-1", 30);
    t.env.ledger().set_sequence_number(100);
    t.client.supplier_cancel(&t.supplier, &sid1);
    assert_eq!(
        t.client.get_shipment(&sid1).status,
        ShipmentStatus::Cancelled
    );

    // Trigger cooldown at ledger 200 (active until 200 + 400 = 600)
    t.env.ledger().set_sequence_number(150);
    let sid2 = create_shipment_and_submit_proof(&t, "CYCLE-2", 30);
    t.env.ledger().set_sequence_number(200);
    assert!(t.client.try_supplier_cancel(&t.supplier, &sid2).is_err());

    // Advance to Cycle 2 past window (100 + 1000 = 1100): ledger 1200
    t.env.ledger().set_sequence_number(1200);
    t.client.supplier_cancel(&t.supplier, &sid2);
    assert_eq!(
        t.client.get_shipment(&sid2).status,
        ShipmentStatus::Cancelled
    );

    // Cycle 2 cooldown re-attempt: another cancellation in the new window triggers cooldown again
    t.env.ledger().set_sequence_number(1250);
    let sid3 = create_shipment_and_submit_proof(&t, "CYCLE-3", 30);
    t.env.ledger().set_sequence_number(1300);

    // Re-attempt exceeds limit in Cycle 2 -> triggers cooldown again until 1300 + 400 = 1700
    assert!(t.client.try_supplier_cancel(&t.supplier, &sid3).is_err());
    assert_eq!(t.client.get_shipment(&sid3).status, ShipmentStatus::Active);

    // Within re-attempt cooldown window at ledger 1500 (< 1700) -> rejected
    t.env.ledger().set_sequence_number(1500);
    assert!(t.client.try_supplier_cancel(&t.supplier, &sid3).is_err());

    // After re-attempt cooldown and window expire (1200 + 1000 = 2200): ledger 2300 -> succeeds
    t.env.ledger().set_sequence_number(2300);
    t.client.supplier_cancel(&t.supplier, &sid3);
    assert_eq!(
        t.client.get_shipment(&sid3).status,
        ShipmentStatus::Cancelled
    );
}

#[test]
fn test_supplier_cancel_no_limit_when_disabled() {
    let t = setup();

    // max_cancellations = 0 disables the limit
    t.client
        .set_supplier_cancel_cooldown(&t.admin, &t.supplier, &0, &1000, &500);

    t.env.ledger().set_sequence_number(50);
    let sid1 = create_shipment_and_submit_proof(&t, "NOLIM-1", 20);
    t.env.ledger().set_sequence_number(80);
    t.client.supplier_cancel(&t.supplier, &sid1);

    let sid2 = create_shipment_and_submit_proof(&t, "NOLIM-2", 20);
    t.env.ledger().set_sequence_number(120);
    // Succeeds without delay
    t.client.supplier_cancel(&t.supplier, &sid2);

    assert_eq!(
        t.client.get_shipment(&sid1).status,
        ShipmentStatus::Cancelled
    );
    assert_eq!(
        t.client.get_shipment(&sid2).status,
        ShipmentStatus::Cancelled
    );
}
