# Mainnet Deployment Checklist

Use this checklist before and immediately after deploying the contracts to mainnet. Every item must be checked off and the completed checklist archived with the release record. Cross-reference [RUNBOOK.md](./RUNBOOK.md) for operational procedures and the Deployment Security Checklist in [SECURITY.md](./SECURITY.md).

## 1. Pre-flight

### Code & Audit
- [ ] External security audit is complete and all findings are resolved or explicitly accepted and documented.
- [ ] All tests pass in CI on the release commit (`cargo test`, integration tests, and end-to-end tests).
- [ ] Release commit has been reviewed and approved by at least two maintainers.
- [ ] No uncommitted changes; the deployed WASM is built from the tagged release commit.

### Configuration Review
- [ ] Contract parameters reviewed and signed off: fees, dispute bond, holdback, and late penalties.
- [ ] Storage schema/version verified via `storage_schema_version()` and matches the expected release version.
- [ ] Token allowlist is set and reviewed (only intended tokens are allowed).
- [ ] Oracle allowlist is set and reviewed (only intended oracle addresses are allowed).
- [ ] Depeg guard is configured with the intended thresholds and reviewed.

### Access Control
- [ ] Multisig admin is configured and the multisig transaction flow has been tested on testnet.
- [ ] Role grants reviewed and assigned to the correct addresses: `Pauser`, `FeeManager`, `Arbiter`.
- [ ] No single-key (non-multisig) admin remains on any privileged role.

## 2. Deployment

- [ ] WASM is built and optimized for the release commit.
- [ ] Contract is deployed to mainnet.
- [ ] `init` is called with the multisig admin address.
- [ ] Resulting contract ID is recorded in the backend configuration.
- [ ] Resulting contract ID is recorded in the frontend configuration.

## 3. Post-deploy Verification

- [ ] Smoke-test `create_shipment` and `confirm_milestone` on a small shipment.
- [ ] Verify events from the smoke test are indexed by the backend.
- [ ] Check `/api/health` returns healthy.
- [ ] Confirm metrics are reporting and alerting is active.
- [ ] Document the rollback/upgrade plan for this deployment and confirm it is understood by the on-call team.

---

See [RUNBOOK.md](./RUNBOOK.md) for incident and operational procedures, and the Deployment Security Checklist in [SECURITY.md](./SECURITY.md) for security-specific requirements.