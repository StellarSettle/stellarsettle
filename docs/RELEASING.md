# Releasing

This document describes how the components in this monorepo are versioned and released, and how their releases relate to each other and to git tags.

## Components

The repository contains three independently versioned components:

| Component | Location | Tag prefix |
| --- | --- | --- |
| Contracts | `contracts/stellarsettle` | `contract-vX.Y.Z` |
| Backend | `backend/` | `backend-vX.Y.Z` |
| Frontend | `frontend/` | `frontend-vX.Y.Z` |

## Versioning model

Each component follows [Semantic Versioning](https://semver.org/) independently. There is no single repository-wide version number; the version of one component says nothing about the version of another.

- **Contracts** — `MAJOR` for breaking ABI/storage changes, `MINOR` for backwards-compatible additions (new functions, new events), `PATCH` for fixes that do not change the interface.
- **Backend** — versioned against its public HTTP API and its compatibility with deployed contracts.
- **Frontend** — versioned against user-visible behaviour and the backend/contract versions it supports.

### Git tags

Tags are the source of truth for what has been released. Always use the component-prefixed form:

```
contract-v1.2.0
backend-v1.2.0
frontend-v1.2.0
```

Do not use bare `vX.Y.Z` tags — they are ambiguous in a monorepo. Tags are annotated and pushed to the shared remote; never move or delete a published tag.

## Coordinated vs. independent releases

Because contracts, backend, and frontend share a repository but not a version, the key question for every contract change is: **does anything outside the contract need to change to keep working?**

### A contract upgrade requires coordinated backend/frontend releases when it:

- changes the ABI (function signatures, argument types, return types, struct layouts);
- adds, removes, or changes events (backend indexers and frontend listeners depend on these);
- adds, renames, or removes storage keys, or changes how stored data is encoded;
- changes authorization requirements or error codes that callers branch on;
- changes initialization or upgrade semantics that operators must follow.

In these cases:

1. Release the contract first (or stage it on testnet), tagged `contract-vX.Y.Z`.
2. Release the backend with the matching ABI/event handling, tagged `backend-vX.Y.Z`.
3. Release the frontend once the backend it depends on is live, tagged `frontend-vX.Y.Z`.

Record the compatible set of versions in the contract release's changelog entry (e.g. "requires backend >= 1.4.0, frontend >= 1.4.0").

### Components can be released independently when:

- the contract change is internal only (gas optimizations, refactors, comments) with no ABI, event, storage, or error-code impact;
- the backend change does not alter its public API or its contract interaction;
- the frontend change is UI-only and does not depend on new backend or contract behaviour.

In these cases bump and tag only the affected component. A backend or frontend release that is compatible with the currently deployed contract does **not** require a contract release.

When in doubt, treat the change as coordinated and note the dependency explicitly.

## CHANGELOG.md convention

All release notes live in the root [`CHANGELOG.md`](../CHANGELOG.md).

- Every change that will ship goes under the **`## Unreleased`** section at the top of the file.
- Entries are grouped by component using subheadings: `### Contracts`, `### Backend`, `### Frontend`.
- When cutting a release, move the relevant entries out of `Unreleased` into a new versioned section for that component, e.g. `## contract-v1.2.0 — 2025-01-15`, and leave `Unreleased` in place (empty or with remaining entries).
- **The tag is cut from the commit that updates the changelog.** Do not tag a commit that does not contain the corresponding changelog entry.

## Release checklist

For each component being released:

1. [ ] Confirm the change set and decide whether it is a coordinated or independent release (see above).
2. [ ] Update `CHANGELOG.md`: move entries from `Unreleased` into a new versioned section for the component.
3. [ ] Bump the version in the component's manifest (`Cargo.toml` for contracts, `package.json` for backend/frontend).
4. [ ] Run the component's tests and build (`cargo test` / `npm test` / `npm run build` as applicable).
5. [ ] Commit the version bump and changelog together.
6. [ ] Create the annotated tag (`contract-vX.Y.Z`, `backend-vX.Y.Z`, or `frontend-vX.Y.Z`) on that commit.
7. [ ] Push the commit and the tag.
8. [ ] For coordinated releases, deploy in order: contracts → backend → frontend, and verify each stage before proceeding.
9. [ ] Record the compatible component versions in the release notes.

## See also

- [`CHANGELOG.md`](../CHANGELOG.md)
- [`README.md`](../README.md) — setup, development, and deployment instructions.