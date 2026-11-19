#!/usr/bin/env bash
# Create a StellarSettle shipment with sensible defaults.
#
# Example:
#   scripts/create-shipment.sh --id SHIP-001 \
#     --buyer GBUYER... --supplier GSUPP... --logistics GLOG... --arbiter GARB... \
#     --token CUSDC... --amount 1000000000 \
#     --milestones "Dispatched:25,In Transit:50,Delivered:25"
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<'USAGE'
Usage: scripts/create-shipment.sh --id <SHIPMENT_ID> --supplier <G...> --logistics <G...>
                                 --arbiter <G...> --token <C...> --amount <UNITS> [options]

Locks `--amount` token units in escrow and creates a milestone-based shipment.

Required:
  --id <SHIPMENT_ID>        Unique shipment ID, e.g. SHIP-2026-001
  --supplier <G...>         Supplier address
  --logistics <G...>        Logistics provider address
  --arbiter <G...>          Arbiter address
  --token <C...>            Token (SAC) contract address, e.g. USDC
  --amount <UNITS>          Total escrow amount in the token's smallest units

Options:
  --buyer <G...>            Buyer address; repeat for co-buyers
                            (default: the address of --source)
  --milestones <LIST>       Comma-separated "Name:percent" pairs summing to 100
                            (default: "Goods Dispatched:25,In Transit:50,Delivered:25")
  --mode <parallel|sequential>
                            Milestone ordering mode (default: parallel)
USAGE
  common_usage
}

SHIPMENT_ID=""
BUYERS=()
SUPPLIER=""
LOGISTICS=""
ARBITER=""
TOKEN=""
AMOUNT=""
MILESTONES="Goods Dispatched:25,In Transit:50,Delivered:25"
MODE="parallel"

while [[ $# -gt 0 ]]; do
  if parse_common_flag "$@"; then shift "$SHIFT_BY"; continue; fi
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --id) SHIPMENT_ID="${2:-}"; shift 2 ;;
    --buyer) BUYERS+=("${2:-}"); shift 2 ;;
    --supplier) SUPPLIER="${2:-}"; shift 2 ;;
    --logistics) LOGISTICS="${2:-}"; shift 2 ;;
    --arbiter) ARBITER="${2:-}"; shift 2 ;;
    --token) TOKEN="${2:-}"; shift 2 ;;
    --amount) AMOUNT="${2:-}"; shift 2 ;;
    --milestones) MILESTONES="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    *) usage >&2; die "unknown option: $1" ;;
  esac
done

check_common
require_value "--id" "$SHIPMENT_ID"
require_address "--supplier" "$SUPPLIER"
require_address "--logistics" "$LOGISTICS"
require_address "--arbiter" "$ARBITER"
require_address "--token" "$TOKEN"
require_uint "--amount" "$AMOUNT"
[[ "$AMOUNT" -gt 0 ]] || die "--amount must be greater than zero"

case "$MODE" in
  parallel) MODE_VARIANT="Parallel" ;;
  sequential) MODE_VARIANT="Sequential" ;;
  *) die "--mode must be 'parallel' or 'sequential', got '$MODE'" ;;
esac

if [[ ${#BUYERS[@]} -eq 0 ]]; then
  BUYERS=("$(identity_address "$SOURCE")")
fi
for b in "${BUYERS[@]}"; do
  [[ "$b" == "<address-of-"* ]] || require_address "--buyer" "$b"
done

# --- Build the milestones JSON ----------------------------------------------
milestones_json=""
total_percent=0
IFS=',' read -r -a entries <<< "$MILESTONES"
[[ ${#entries[@]} -gt 0 ]] || die "--milestones must list at least one milestone"
for entry in "${entries[@]}"; do
  name="${entry%:*}"
  pct="${entry##*:}"
  [[ "$entry" == *:* && -n "$name" ]] || die "milestone '$entry' must look like Name:percent"
  require_uint "milestone percent for '$name'" "$pct"
  total_percent=$((total_percent + pct))
  [[ -n "$milestones_json" ]] && milestones_json+=","
  milestones_json+="{\"name\":\"$(json_escape "$name")\",\"payment_percent\":$pct,\"proof_hash\":\"\","
  milestones_json+="\"status\":\"Pending\",\"release_after_ledger\":0,\"proof_submitted_ledger\":null,"
  milestones_json+="\"dispute_opened_ledger\":null,\"deadline_ledger\":0,\"penalty_bps_per_ledger\":0}"
done
[[ "$total_percent" -eq 100 ]] || die "milestone percentages must sum to 100 (got $total_percent)"
milestones_json="[$milestones_json]"

buyers_json=""
for b in "${BUYERS[@]}"; do
  [[ -n "$buyers_json" ]] && buyers_json+=","
  buyers_json+="\"$b\""
done
buyers_json="[$buyers_json]"

# Default ShipmentOptions: every optional feature disabled. Mirrors
# `default_options` in contracts/stellarsettle/src/test_common.rs.
options_json=$(cat <<JSON
{"response_deadline":0,"penalty_bps":0,"milestone_mode":"$MODE_VARIANT","holdback_ledgers":0,
"dispute_cooldown_ledgers":0,"late_penalty_bps_per_ledger":0,"auto_confirm_ledgers":0,
"dispute_bond_amount":"0","dispute_bond_bps":0,"arbiter_fee_bps":0,"logistics_fee_bps":0,
"supplier_collateral":"0","expires_at_ledger":null,"metadata_hash":null,"referrer":null,
"buyer_cancel_fee_bps":0,"early_bonus_pool":"0","review_window_ledgers":null,
"milestone_splits":[],"deadlines":[],"dispute_timeout_seconds":0,"default_resolution":"Buyer",
"backup_arbiter":null,"confirmation_cooldown_ledgers":null,"arbiter_panel":[],"jurisdiction":null,
"grace_period_ledgers":0,"quality_grades":[],"milestone_quantities":[],"retainage_bps":0,
"warranty_bps":0,"warranty_ledgers":0,"inspector":null,"inspected_milestones":[],
"proof_submitters":[],"require_dual_attestation":false,"fund_from_vault":false,
"milestone_suppliers":[],"refund_recipient":null}
JSON
)
options_json="${options_json//$'\n'/}"

invoke create_shipment \
  --shipment_id "$SHIPMENT_ID" \
  --buyers "$buyers_json" \
  --supplier "$SUPPLIER" \
  --logistics "$LOGISTICS" \
  --arbiter "$ARBITER" \
  --token "$TOKEN" \
  --total_amount "$AMOUNT" \
  --milestones "$milestones_json" \
  --options "$options_json"
