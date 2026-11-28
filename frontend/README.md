# Frontend

This directory contains the frontend application.

## Bundle-size budget

The frontend has a defined performance budget for its production bundle. The budget is enforced with [`size-limit`](https://github.com/ai/size-limit) as part of the build, and CI fails if the production bundle exceeds the configured budget.

### Configured limits (per entry chunk)

| Entry chunk | Limit |
| --- | --- |
| `build/static/js/main.*.js` | 250 kB |
| `build/static/js/*.chunk.js` (each lazy-loaded chunk) | 150 kB |
| `build/static/css/main.*.css` | 50 kB |

Limits are measured on the gzipped production build output. The exact configuration lives in the `size-limit` section of `package.json` (and/or `.size-limit.json`); update this table whenever the budget changes.

### Rationale

- **No unchecked growth.** New pages (loan manager, admin and arbiter dashboards) add code to the bundle. A hard budget keeps bundle growth visible and intentional rather than accidental.
- **Performance on constrained devices and networks.** The application targets users on slower connections and lower-end devices; keeping the main entry chunk small keeps time-to-interactive reasonable.
- **Lazy loading is encouraged.** Per-chunk limits push feature code into lazy-loaded route chunks instead of the main entry chunk, so users only download what they need.
- **Reviewable changes.** Any change that exceeds the budget must be justified and the budget updated deliberately in the same pull request, making size regressions explicit during review.

### Running the size check locally

Build the production bundle and run the size check:

```bash
cd frontend
npm run build
npm run size
```

`npm run size` reports the size of each configured entry chunk against its budget and exits non-zero if any limit is exceeded.

### CI enforcement

CI runs the size check against the production build. If any entry chunk exceeds its configured budget, the check fails and the pull request cannot be merged until the bundle is reduced or the budget is intentionally updated (with the rationale documented here).