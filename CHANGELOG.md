# Changelog

All notable changes to the StellarSettle contracts are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Contract versions are reported on-chain via `version()` and the storage layout
version via `storage_schema_version()`. Each released contract version below
corresponds to a `version()` value; storage schema bumps are noted explicitly.

> **Note:** Any pull request that affects contract behavior, storage layout,
> public interfaces, or version numbers **must** update this file. Add entries
> under `[Unreleased]` and move them into a new version section at release time.

## [Unreleased]

### Added

- Nothing yet.

### Changed

- Nothing yet.

### Fixed

- Nothing yet.

## [0.7.0] - Contract version 7

### Added

- Governance timelock for protocol parameter changes, requiring a delay
  between proposal and execution.
- Admin succession flow allowing the current admin to nominate and hand over
  control to a successor with an explicit acceptance step.

### Changed

- Dispute resolution now enforces a finality delay before a ruling can be
  executed, giving parties a window to contest or appeal.

## [0.6.0] - Contract version 6

### Added

- Insurance holdback: a portion of escrowed funds is retained as a holdback to
  cover potential claims before final settlement.
- Oracle price conditions allowing escrow release to be gated on an external
  price feed satisfying configured thresholds.

### Changed

- Settlement finalization accounts for holdback release timing.

## [0.5.0] - Contract version 5

### Added

- Buyer reliability scoring, tracking on-time payments and dispute outcomes to
  inform future escrow terms.

## [0.4.0] - Contract version 4

### Added

- Multi-recipient fee distribution, allowing platform and referral fees to be
  split across multiple recipients at settlement.

## [0.3.0] - Contract version 3

### Added

- Treasury revenue tracking, recording accrued protocol revenue for later
  withdrawal and reporting.

## [0.2.0] - Contract version 2

### Added

- Storage schema versioning via `storage_schema_version()` to support safe
  migrations of persisted state.

### Changed

- Persisted state layout formalized and versioned.

## [0.1.0] - Contract version 1

### Added

- Initial escrow contract release with core create, fund, and release flows.
- `version()` entry point reporting the contract version.

[Unreleased]: https://github.com/example/stellarsettle/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/example/stellarsettle/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/example/stellarsettle/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/example/stellarsettle/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/example/stellarsettle/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/example/stellarsettle/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/example/stellarsettle/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/example/stellarsettle/releases/tag/v0.1.0