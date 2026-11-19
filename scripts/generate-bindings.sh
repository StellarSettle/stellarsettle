#!/usr/bin/env bash
# Regenerate the TypeScript bindings in bindings/<contract> from the contract spec.
#
# Examples:
#   scripts/generate-bindings.sh                          # all contracts, local WASM builds
#   scripts/generate-bindings.sh loan_manager             # one contract
#   scripts/generate-bindings.sh stellarsettle --contract-id C... --network testnet
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STELLAR_BIN="${STELLAR_BIN:-stellar}"
ALL_CONTRACTS=(stellarsettle loan_manager)

usage() {
  cat <<'USAGE'
Usage: scripts/generate-bindings.sh [CONTRACT...] [options]

Generates typed TypeScript clients with `stellar contract bindings typescript`
into bindings/<contract>/ and builds each package to verify it compiles.

Contracts: stellarsettle, loan_manager (default: all)

Options:
  --contract-id <C...>   Generate from a deployed contract's on-chain spec instead
                         of a local WASM build (only with a single contract)
  --network <name>       Network for --contract-id (env: STELLAR_NETWORK, default: testnet)
  --skip-build           Reuse existing target/wasm32v1-none/release/<contract>.wasm
  --no-verify            Skip `npm install && npm run build` of the generated packages
  -h, --help             Show this help
USAGE
}

CONTRACTS=()
CONTRACT_ID=""
NETWORK="${STELLAR_NETWORK:-testnet}"
SKIP_BUILD=0
VERIFY=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --contract-id) CONTRACT_ID="${2:-}"; shift 2 ;;
    --network) NETWORK="${2:-}"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --no-verify) VERIFY=0; shift ;;
    stellarsettle|loan_manager) CONTRACTS+=("$1"); shift ;;
    *) usage >&2; echo "error: unknown argument: $1" >&2; exit 1 ;;
  esac
done

[[ ${#CONTRACTS[@]} -gt 0 ]] || CONTRACTS=("${ALL_CONTRACTS[@]}")
if [[ -n "$CONTRACT_ID" && ${#CONTRACTS[@]} -ne 1 ]]; then
  echo "error: --contract-id requires exactly one contract name" >&2
  exit 1
fi
command -v "$STELLAR_BIN" >/dev/null 2>&1 || {
  echo "error: stellar CLI not found; install it (see README Prerequisites) or set STELLAR_BIN" >&2
  exit 1
}

cd "$ROOT"
for contract in "${CONTRACTS[@]}"; do
  out="bindings/$contract"
  echo "==> Generating TypeScript bindings for $contract -> $out"

  if [[ -n "$CONTRACT_ID" ]]; then
    "$STELLAR_BIN" contract bindings typescript \
      --contract-id "$CONTRACT_ID" --network "$NETWORK" \
      --output-dir "$out" --overwrite
  else
    wasm="target/wasm32v1-none/release/$contract.wasm"
    if [[ "$SKIP_BUILD" -eq 0 ]]; then
      "$STELLAR_BIN" contract build --package "$contract"
    fi
    [[ -f "$wasm" ]] || { echo "error: $wasm not found" >&2; exit 1; }
    "$STELLAR_BIN" contract bindings typescript \
      --wasm "$wasm" --output-dir "$out" --overwrite
  fi

  # Give the generated package a stable, scoped, private name.
  # shellcheck disable=SC2016 # JS template literals, not shell expansions.
  node -e '
    const fs = require("fs");
    const [file, contract] = process.argv.slice(1);
    const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
    const ordered = {
      name: `@stellarsettle/${contract.replace(/_/g, "-")}-bindings`,
      version: pkg.version,
      private: true,
      description: `Generated TypeScript client for the ${contract} Soroban contract`,
      ...pkg,
    };
    ordered.name = `@stellarsettle/${contract.replace(/_/g, "-")}-bindings`;
    ordered.private = true;
    fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + "\n");
  ' "$out/package.json" "$contract"

  if [[ "$VERIFY" -eq 1 ]]; then
    echo "==> Building $out"
    (cd "$out" && npm install --no-audit --no-fund && npm run build)
  fi
done

echo "Done. Review and commit the changes under bindings/."
