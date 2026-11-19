#!/usr/bin/env bash
# Read a shipment's on-chain state (simulation only, nothing is submitted).
#
# Example:
#   scripts/get-shipment.sh --id SHIP-001
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<'USAGE'
Usage: scripts/get-shipment.sh --id <SHIPMENT_ID> [options]

Prints the shipment (parties, milestones, statuses, released amount) as JSON.

Required:
  --id <SHIPMENT_ID>      Shipment ID
USAGE
  common_usage
}

SHIPMENT_ID=""

while [[ $# -gt 0 ]]; do
  if parse_common_flag "$@"; then shift "$SHIFT_BY"; continue; fi
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --id) SHIPMENT_ID="${2:-}"; shift 2 ;;
    *) usage >&2; die "unknown option: $1" ;;
  esac
done

check_common
require_value "--id" "$SHIPMENT_ID"

INVOKE_FLAGS=(--send=no)
invoke get_shipment --shipment_id "$SHIPMENT_ID"
