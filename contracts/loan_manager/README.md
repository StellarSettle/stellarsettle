# loan_manager

Soroban lending pool. Depositors supply the debt asset; borrowers lock collateral and borrow against it; undercollateralised positions can be liquidated.

## Key functions

- Admin: `init`, `set_oracles`, `set_market`, `set_liq_params`, `set_interest_rate` (capped at `MAX_INTEREST_RATE_BPS`), `pause` / `unpause`, `seize_defaulted`.
- Liquidity: `deposit`, `withdraw`.
- Borrowing: `deposit_collateral`, `borrow`, `borrow_with_term`, `repay`, `withdraw_collateral`.
- Liquidation: `liquidate`, `health_factor`.
- Oracles: `record_price`, `preview_price`, `get_twap`, `twap_now` (primary and secondary oracle failover plus TWAP).
- Views: `get_position`, `get_depositor_balance`, `get_pool_info`, `get_depositors`, `get_liquidation_params`, `get_market_config`, `get_oracles`, `get_admin`, `get_interest_rate`, `is_paused_view`.

## Storage layout

Keys are defined in `src/storage.rs` (`DataKey`): admin, paused flag, oracle addresses, market config (collateral/debt assets and liquidation threshold), liquidation params, interest rate (bps), pool totals, per-user `Position` (collateral, debt), per-depositor balances and the depositor list, and TWAP price observations.

## Interaction with the escrow contract

None. `loan_manager` is standalone and does not call, or get called by, the main `stellarsettle` escrow contract; the two only share the workspace.

## Interest

The configured rate is stored and capped, but debt is currently not accrued over time (see `src/test_fz_interest.rs`).

## Deploying to Testnet

Step-by-step walkthrough for deploying `loan_manager` to Stellar testnet. Every command below is copy-pasteable; run them from the repository root unless noted.

### 1. Fund the deployer account via Friendbot

Generate a keypair (or reuse an existing testnet identity) and fund it:

```bash
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet
```

`stellar keys fund` calls Friendbot under the hood. If you prefer the raw endpoint:

```bash
curl "https://friendbot.stellar.org?addr=$(stellar keys address deployer)"
```

Confirm the balance before continuing:

```bash
stellar keys address deployer
stellar account balance --account $(stellar keys address deployer) --network testnet
```

### 2. Build the contract

```bash
cargo build --release --target wasm32-unknown-unknown -p loan_manager
```

The optimized artifact is written to `target/wasm32-unknown-unknown/release/loan_manager.wasm`. Optionally shrink it:

```bash
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/loan_manager.wasm
```

### 3. Deploy with `stellar contract deploy`

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/loan_manager.wasm \
  --source deployer \
  --network testnet
```

The command prints the contract ID. Export it for the remaining steps:

```bash
export LOAN_MANAGER_ID=<contract-id-from-previous-step>
```

### 4. Set the allowed token list

Configure the market (collateral and debt assets) and the admin. Replace the asset addresses with the testnet tokens you intend to allow:

```bash
stellar contract invoke \
  --id "$LOAN_MANAGER_ID" \
  --source deployer \
  --network testnet \
  -- init \
  --admin $(stellar keys address deployer) \
  --collateral_asset <COLLATERAL_TOKEN_ADDRESS> \
  --debt_asset <DEBT_TOKEN_ADDRESS>
```

Then set the liquidation parameters and interest rate:

```bash
stellar contract invoke \
  --id "$LOAN_MANAGER_ID" \
  --source deployer \
  --network testnet \
  -- set_liq_params \
  --threshold_bps 8000 \
  --penalty_bps 500

stellar contract invoke \
  --id "$LOAN_MANAGER_ID" \
  --source deployer \
  --network testnet \
  -- set_interest_rate \
  --rate_bps 500
```

Verify the configuration:

```bash
stellar contract invoke \
  --id "$LOAN_MANAGER_ID" \
  --source deployer \
  --network testnet \
  -- get_market_config
```

### 5. Create a test shipment from the CLI

Exercise the pool end-to-end: deposit liquidity, post collateral, and borrow against it.

```bash
# Deposit debt asset into the pool
stellar contract invoke \
  --id "$LOAN_MANAGER_ID" \
  --source deployer \
  --network testnet \
  -- deposit \
  --depositor $(stellar keys address deployer) \
  --amount 1000000000

# Post collateral
stellar contract invoke \
  --id "$LOAN_MANAGER_ID" \
  --source deployer \
  --network testnet \
  -- deposit_collateral \
  --user $(stellar keys address deployer) \
  --amount 500000000

# Borrow against the collateral
stellar contract invoke \
  --id "$LOAN_MANAGER_ID" \
  --source deployer \
  --network testnet \
  -- borrow \
  --user $(stellar keys address deployer) \
  --amount 100000000

# Inspect the resulting position
stellar contract invoke \
  --id "$LOAN_MANAGER_ID" \
  --source deployer \
  --network testnet \
  -- get_position \
  --user $(stellar keys address deployer)
```

If `get_position` returns the expected collateral and debt, the deployment is working end-to-end.

## Tests

Unit tests live in `src/test_*.rs`, wired up from `src/test.rs`.
