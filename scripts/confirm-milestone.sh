#!/usr/bin/env bash
# Confirm a milestone as the buyer, releasing its share of the escrow.
#
# Example:
#   scripts/confirm-milestone.sh --id SHIP-001 --milestone 0
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<'USAGE'
Usage: scripts/confirm-milestone.sh --id <SHIPMENT_ID> --milestone <INDEX> [options]

Confirms a milestone with submitted proof and releases its payment to the supplier.

Required:
  --id <SHIPMENT_ID>      Shipment ID
  --milestone <INDEX>     Zero-based milestone index

Options:
  --buyer <G...>          Confirming buyer address (default: the address of --source)
USAGE
  common_usage
}

SHIPMENT_ID=""
MILESTONE=""
BUYER=""

while [[ $# -gt 0 ]]; do
  if parse_common_flag "$@"; then shift "$SHIFT_BY"; continue; fi
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --id) SHIPMENT_ID="${2:-}"; shift 2 ;;
    --milestone) MILESTONE="${2:-}"; shift 2 ;;
    --buyer) BUYER="${2:-}"; shift 2 ;;
    *) usage >&2; die "unknown option: $1" ;;
  esac
done

check_common
require_value "--id" "$SHIPMENT_ID"
require_uint "--milestone" "$MILESTONE"
if [[ -z "$BUYER" ]]; then
  BUYER="$(identity_address "$SOURCE")"
else
  require_address "--buyer" "$BUYER"
fi

invoke confirm_milestone \
  --buyer "$BUYER" \
  --shipment_id "$SHIPMENT_ID" \
  --milestone_index "$MILESTONE"
