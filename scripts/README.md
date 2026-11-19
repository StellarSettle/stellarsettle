# StellarSettle CLI helper scripts

Thin wrappers around `stellar contract invoke` for the most common
StellarSettle flows. They fill in the long argument lists (full `Milestone`
and `ShipmentOptions` structs, signer addresses, network flags) so a
shipment can be driven end to end with a few friendly flags.

| Script | Contract function | Who signs |
| --- | --- | --- |
| `create-shipment.sh` | `create_shipment` | Buyer (locks the escrow) |
| `submit-proof.sh` | `submit_proof` | Supplier or logistics |
| `confirm-milestone.sh` | `confirm_milestone` | Buyer (releases payment) |
| `get-shipment.sh` | `get_shipment` (simulated, never submitted) | Anyone |
| `generate-bindings.sh` | — regenerates the TypeScript bindings in `bindings/` | — |

## Requirements

- Bash 4+
- [`stellar` CLI](../README.md#prerequisites) on `PATH` (or point `STELLAR_BIN` at it)
- A funded identity, e.g. `stellar keys generate --global buyer --network testnet --fund`

## Configuration

Every script accepts these flags; each falls back to an environment variable:

| Flag | Environment variable | Default |
| --- | --- | --- |
| `--contract-id` | `STELLARSETTLE_CONTRACT_ID` (or `STELLAR_CONTRACT_ID`) | — (required) |
| `--network` | `STELLAR_NETWORK` | `testnet` |
| `--source` | `STELLAR_ACCOUNT` | — (required) |

Add `--dry-run` to print the exact `stellar contract invoke` command without
running it, and `--help` to see every option of a script.

## Walkthrough (testnet)

```bash
export STELLARSETTLE_CONTRACT_ID=C...   # from `make -C contracts/stellarsettle deploy-testnet`
export STELLAR_NETWORK=testnet

# 1. Buyer creates the shipment and locks 1,000 USDC (7 decimals) in escrow.
#    The buyer defaults to the address of --source.
scripts/create-shipment.sh --source buyer \
  --id SHIP-2026-001 \
  --supplier "$(stellar keys address supplier)" \
  --logistics "$(stellar keys address logistics)" \
  --arbiter "$(stellar keys address arbiter)" \
  --token <USDC_SAC_ADDRESS> \
  --amount 10000000000 \
  --milestones "Goods Dispatched:25,In Transit:50,Delivered:25"

# 2. Supplier submits proof for milestone 0.
scripts/submit-proof.sh --source supplier \
  --id SHIP-2026-001 --milestone 0 --proof-hash ipfs://bafy...

# 3. Buyer confirms milestone 0, releasing 25% to the supplier.
scripts/confirm-milestone.sh --source buyer --id SHIP-2026-001 --milestone 0

# Inspect the shipment at any point.
scripts/get-shipment.sh --source buyer --id SHIP-2026-001
```

`create-shipment.sh` options:

- `--buyer <G...>` — repeat for co-buyers (default: address of `--source`).
- `--milestones "Name:percent,..."` — percentages must sum to 100
  (default: `Goods Dispatched:25,In Transit:50,Delivered:25`).
- `--mode parallel|sequential` — milestone ordering (default: `parallel`).

All other `ShipmentOptions` features (holdbacks, bonds, fees, deadlines,
retainage, inspectors, …) are disabled, matching `default_options` in
`contracts/stellarsettle/src/test_common.rs`. Call `stellar contract invoke`
directly (use `--dry-run` output as a starting point) when you need them.

`submit-proof.sh` options: `--proof-type <symbol>` (default `ipfs`) and
`--caller <G...>` (default: address of `--source`).

`confirm-milestone.sh` options: `--buyer <G...>` (default: address of `--source`).

## Local network

The scripts work against any network the `stellar` CLI knows about. For a
local quickstart node:

```bash
stellar container start local
stellar network use local   # or pass --network local to each script
```
