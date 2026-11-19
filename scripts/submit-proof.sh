#!/usr/bin/env bash
# Submit delivery proof for a shipment milestone (supplier or logistics).
#
# Example:
#   scripts/submit-proof.sh --id SHIP-001 --milestone 0 --proof-hash ipfs://bafy...
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<'USAGE'
Usage: scripts/submit-proof.sh --id <SHIPMENT_ID> --milestone <INDEX> --proof-hash <HASH> [options]

Records proof (e.g. an IPFS CID) for a milestone so the buyer can confirm it.

Required:
  --id <SHIPMENT_ID>      Shipment ID
  --milestone <INDEX>     Zero-based milestone index
  --proof-hash <HASH>     Proof reference, e.g. ipfs://bafy...

Options:
  --proof-type <SYMBOL>   Proof type symbol (default: ipfs)
  --caller <G...>         Submitting supplier/logistics address
                          (default: the address of --source)
USAGE
  common_usage
}

SHIPMENT_ID=""
MILESTONE=""
PROOF_HASH=""
PROOF_TYPE="ipfs"
CALLER=""

while [[ $# -gt 0 ]]; do
  if parse_common_flag "$@"; then shift "$SHIFT_BY"; continue; fi
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --id) SHIPMENT_ID="${2:-}"; shift 2 ;;
    --milestone) MILESTONE="${2:-}"; shift 2 ;;
    --proof-hash) PROOF_HASH="${2:-}"; shift 2 ;;
    --proof-type) PROOF_TYPE="${2:-}"; shift 2 ;;
    --caller) CALLER="${2:-}"; shift 2 ;;
    *) usage >&2; die "unknown option: $1" ;;
  esac
done

check_common
require_value "--id" "$SHIPMENT_ID"
require_uint "--milestone" "$MILESTONE"
require_value "--proof-hash" "$PROOF_HASH"
[[ "$PROOF_TYPE" =~ ^[A-Za-z0-9_]{1,32}$ ]] || die "--proof-type must be a Soroban symbol ([A-Za-z0-9_], max 32 chars)"
if [[ -z "$CALLER" ]]; then
  CALLER="$(identity_address "$SOURCE")"
else
  require_address "--caller" "$CALLER"
fi

invoke submit_proof \
  --caller "$CALLER" \
  --shipment_id "$SHIPMENT_ID" \
  --milestone_index "$MILESTONE" \
  --proof_hash "$PROOF_HASH" \
  --proof_type "$PROOF_TYPE"
