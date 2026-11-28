# Good First Issues: A Starter Guide

Welcome to the project! This guide helps new contributors find the right `good first issue` based on their background. Whether you're comfortable with **Rust** or **TypeScript**, there's a place for you to start.

> **TL;DR**
> - **Rust-familiar?** Start with smart contract issues in `contracts/stellarsettle` or `contracts/loan_manager`.
> - **TypeScript-familiar?** Start with backend or frontend issues.

---

## For Rust-Familiar Contributors

If you know Rust (or want to learn it), the smart contracts are a great place to start. The contract code lives in:

- **`contracts/stellarsettle`** — the core settlement contract.
- **`contracts/loan_manager`** — the loan lifecycle and management contract.

These issues typically involve small, well-scoped changes to contract logic, storage, events, or tests. They're a good way to learn the Soroban contract model while contributing real value.

### Concrete good-first-issue examples

- [ ] _Add a unit test for `loan_manager` repayment edge cases_ — [open issue](https://github.com/your-org/your-repo/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+label%3Acontracts)
- [ ] _Emit an event when a settlement is finalized in `stellarsettle`_ — [open issue](https://github.com/your-org/your-repo/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+label%3Acontracts)
- [ ] _Improve error messages returned by `loan_manager`_ — [open issue](https://github.com/your-org/your-repo/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+label%3Acontracts)

> Tip: Browse all currently open contract-related good first issues with the filter above. The list is kept up to date by the `good first issue` and `contracts` labels.

---

## For TypeScript-Familiar Contributors

If you know TypeScript, the backend and frontend are the best starting points. These issues usually involve API endpoints, data handling, UI components, or tooling — all written in TypeScript.

### Backend issues

- [ ] _Add input validation to the settlement API endpoint_ — [open issue](https://github.com/your-org/your-repo/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+label%3Abackend)
- [ ] _Write tests for the loan status service_ — [open issue](https://github.com/your-org/your-repo/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+label%3Abackend)

### Frontend issues

- [ ] _Add a loading state to the loans dashboard_ — [open issue](https://github.com/your-org/your-repo/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+label%3Afrontend)
- [ ] _Improve accessibility of the settlement form_ — [open issue](https://github.com/your-org/your-repo/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+label%3Afrontend)

> Tip: Use the filters above to see all currently open backend and frontend good first issues.

---

## How to Claim an Issue

1. **Find an issue** using the links above (or the `good first issue` label on the repo's Issues tab).
2. **Read the issue carefully** — check the description, acceptance criteria, and any linked files.
3. **Comment on the issue** to let maintainers know you'd like to work on it. Something like:
   > "Hi! I'd like to work on this. I'm familiar with [Rust/TypeScript] and plan to [brief approach]. Is this still available?"
4. **Wait for a maintainer to assign it** (or give the go-ahead) before starting significant work. This avoids duplicate effort.
5. **Open a draft PR early** if you'd like feedback as you go.

## How to Ask Questions

- **On the issue itself** — the best place for questions specific to that task.
- **In discussions / chat** — for general setup or "where do I start?" questions, use the project's discussion forum or community chat (see the main `README`).
- **In your PR** — if you get stuck mid-implementation, it's fine to ask in the PR thread.

Don't be shy — maintainers are happy to help new contributors get unblocked. Welcome aboard! 🎉