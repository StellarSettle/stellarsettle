# Migrating from `stellarsettle-contract` (legacy repo)

This guide is for anyone who was deploying or integrating the legacy
`shakurJJ/stellarsettle-contract` repository. It explains what changed in this
monorepo, how to redeploy using the monorepo tooling, and the updated testnet
contract IDs.

## What changed

- **Monorepo layout.** The single legacy contract repo is now a Cargo workspace
  under `contracts/`. Each contract lives in its own crate (for example
  `contracts/loan_manager`), sharing common types and utilities.
- **Tooling.** Builds, tests, and deployments are driven from the workspace root
  rather than per-repo scripts. See `docs/runbook.md` for the operational
  procedures.
- **CI.** Continuous integration now runs from this repository. The legacy
  `shakurJJ/stellarsettle-contract` badge no longer reflects the current build.
- **Contract IDs.** Testnet deployments have new contract IDs (see below). The
  legacy IDs are deprecated and should not be used for new integrations.

## Redeploying with the monorepo tooling

1. Clone this repository and check out the release you intend to deploy.
2. Build the workspace contracts:

   ```sh
   cargo build --workspace --release --target wasm32-unknown-unknown
   ```

3. Run the test suite before deploying:

   ```sh
   cargo test --workspace
   ```

4. Deploy the built Wasm using the Stellar CLI, pointing at the network and
   identity you use for testnet:

   ```sh
   stellar contract deploy \
     --wasm target/wasm32-unknown-unknown/release/<contract>.wasm \
     --source <identity> \
     --network testnet
   ```

5. Record the returned contract ID and update your integration configuration.
   Follow `docs/runbook.md` for the full deployment and verification checklist.

## Updated contract IDs (testnet)

| Contract       | Testnet contract ID |
| -------------- | ------------------- |
| `loan_manager` | _TBD_               |

> Replace the placeholder above with the deployed testnet contract ID once the
> release is published. Legacy `stellarsettle-contract` IDs are deprecated.

## Integrating

- Use the contract IDs from the table above instead of the legacy IDs.
- Refer to each contract's `README.md` (for example
  `contracts/loan_manager/README.md`) for its interface and invocation details.
- Report issues against this repository, not the legacy repo.
