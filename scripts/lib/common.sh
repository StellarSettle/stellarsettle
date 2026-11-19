#!/usr/bin/env bash
# Shared helpers for the StellarSettle CLI wrapper scripts.
#
# Sourced by scripts/*.sh — not meant to be executed directly.
#
# Configuration (flags override environment variables):
#   STELLARSETTLE_CONTRACT_ID  Deployed stellarsettle contract ID (falls back to STELLAR_CONTRACT_ID)
#   STELLAR_NETWORK            Network name or alias known to the stellar CLI (default: testnet)
#   STELLAR_ACCOUNT            Identity alias or secret key that signs transactions

set -euo pipefail

CONTRACT_ID="${STELLARSETTLE_CONTRACT_ID:-${STELLAR_CONTRACT_ID:-}}"
NETWORK="${STELLAR_NETWORK:-testnet}"
SOURCE="${STELLAR_ACCOUNT:-}"
DRY_RUN=0
# Number of arguments consumed by parse_common_flag; read by the callers.
export SHIFT_BY=0
STELLAR_BIN="${STELLAR_BIN:-stellar}"

die() {
  echo "error: $*" >&2
  exit 1
}

# Parse a flag shared by every script. Returns 0 (and sets SHIFT_BY) when the
# flag was recognised, 1 otherwise.
parse_common_flag() {
  case "$1" in
    --contract-id) [[ $# -ge 2 ]] || die "--contract-id needs a value"; CONTRACT_ID="$2"; SHIFT_BY=2 ;;
    --network) [[ $# -ge 2 ]] || die "--network needs a value"; NETWORK="$2"; SHIFT_BY=2 ;;
    --source) [[ $# -ge 2 ]] || die "--source needs a value"; SOURCE="$2"; SHIFT_BY=2 ;;
    --dry-run) DRY_RUN=1; SHIFT_BY=1 ;;
    *) return 1 ;;
  esac
  return 0
}

common_usage() {
  cat <<'USAGE'
Common options:
  --contract-id <C...>   Contract ID (env: STELLARSETTLE_CONTRACT_ID or STELLAR_CONTRACT_ID)
  --network <name>       stellar CLI network (env: STELLAR_NETWORK, default: testnet)
  --source <identity>    Signing identity alias or secret key (env: STELLAR_ACCOUNT)
  --dry-run              Print the stellar CLI command instead of running it
  -h, --help             Show this help
USAGE
}

require_value() {
  local name="$1" value="$2"
  [[ -n "$value" ]] || die "missing required option $name (see --help)"
}

require_uint() {
  local name="$1" value="$2"
  [[ "$value" =~ ^[0-9]+$ ]] || die "$name must be a non-negative integer, got '$value'"
}

require_address() {
  local name="$1" value="$2"
  [[ "$value" =~ ^[GC][A-Z2-7]{55}$ ]] || die "$name must be a Stellar G... or C... address, got '$value'"
}

# Escape a value for embedding inside a JSON string literal.
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  printf '%s' "$s"
}

# Resolve an address for an identity alias via the stellar CLI.
identity_address() {
  local who="$1"
  if [[ "$who" =~ ^[GC][A-Z2-7]{55}$ ]]; then
    printf '%s' "$who"
    return
  fi
  if [[ "$DRY_RUN" -eq 1 ]] && ! command -v "$STELLAR_BIN" >/dev/null 2>&1; then
    printf '<address-of-%s>' "$who"
    return
  fi
  "$STELLAR_BIN" keys address "$who" 2>/dev/null || die "could not resolve address for identity '$who'; pass the address explicitly"
}

check_common() {
  require_value "--contract-id" "$CONTRACT_ID"
  require_value "--source" "$SOURCE"
  require_value "--network" "$NETWORK"
  if [[ "$DRY_RUN" -eq 0 ]]; then
    command -v "$STELLAR_BIN" >/dev/null 2>&1 \
      || die "stellar CLI not found; install it (see README Prerequisites) or set STELLAR_BIN"
  fi
}

# Extra `stellar contract invoke` flags (placed before `--`), e.g. --send=no.
INVOKE_FLAGS=()

# invoke <function> [--arg value ...]
# Runs `stellar contract invoke` against the configured contract/network.
invoke() {
  local fn="$1"
  shift
  local cmd=("$STELLAR_BIN" contract invoke
    --id "$CONTRACT_ID"
    --source "$SOURCE"
    --network "$NETWORK"
    ${INVOKE_FLAGS[@]+"${INVOKE_FLAGS[@]}"}
    -- "$fn" "$@")
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '%q ' "${cmd[@]}"
    printf '\n'
    return 0
  fi
  "${cmd[@]}"
}
