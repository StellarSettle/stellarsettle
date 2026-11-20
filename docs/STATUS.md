# Project Status Dashboard

**Last updated:** 2025-01-15

This file provides a high-level summary of progress across the four major work areas of the project: Contracts, Backend, Frontend, and DevOps. It is updated periodically by maintainers to give contributors and stakeholders a single place to see what is in progress, what is done, and what is blocked.

> **Note:** This is a living document. If you notice it is out of date, please open a PR or ping a maintainer.

## Work Area Status

| Area | Status | Current focus | Notes / blockers |
|------|--------|---------------|------------------|
| **Contracts** | At risk | Hardening existing contracts; insurance and oracle feature work pending | Insurance and oracle modules are still in design; hardening review outstanding before mainnet. See `contracts/stellarsettle/src/TODO.md` for granular items. |
| **Backend** | On track | Event monitor and metadata API | Event monitor implementation in progress; metadata API endpoints being fleshed out. No major blockers. |
| **Frontend** | On track | Dashboard routes and translations | Dashboard route scaffolding underway; i18n/translation coverage being expanded. Depends on backend metadata API for full functionality. |
| **DevOps** | At risk | CI pipeline, runbook, mainnet readiness | CI workflows being stabilized; runbook drafted; mainnet readiness checklist has open items. See `docs/MAINNET_CHECKLIST.md`. |

### Status legend

- **On track** — progressing as planned, no significant blockers.
- **At risk** — progress is slower than planned or has known dependencies/blockers.
- **Blocked** — cannot proceed until a dependency is resolved.
- **Done** — work area's current scope is complete.

## See also

- [Mainnet Checklist](MAINNET_CHECKLIST.md)
- [Runbook](RUNBOOK.md)
- [Security](SECURITY.md)
- [Changelog](../CHANGELOG.md)