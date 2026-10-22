# Contributor Quickstart

Get StellarSettle running locally in 10 minutes. This guide takes you from clone to a working stack (contracts tested, backend running, frontend running).

## Prerequisites

- **Rust** (latest stable): `rustup default stable`
- **Node.js** (20+): Download from nodejs.org
- **Soroban CLI**: `curl --proto '=https' --tlsv1.2 -sSf https://github.com/stellar/rs-soroban-cli/releases/download/v21.0.0/soroban-cli-21.0.0-x86_64-unknown-linux-gnu.tar.gz | tar xz`
- **Git**: `git --version`

## 1. Clone & Install (2 min)

```bash
git clone <repo-url>
cd stellarsettle

# Install all dependencies
npm install
cd contracts && cargo build && cd ..
```

## 2. Start Soroban Sandbox (1 min)

In a new terminal:

```bash
soroban-cli sandbox start
```

This starts a local Soroban network for testing. Leave it running while you develop.

## 3. Test Contracts (2 min)

```bash
cd contracts
cargo test --all
cd ..
```

You should see ✅ passing tests for the smart contracts.

## 4. Run Backend (2 min)

In another terminal:

```bash
npm --workspace=backend run dev
```

The backend starts on `http://localhost:3000`. You'll see logs like:
```
[backend] Server listening on port 3000
[backend] Connected to Soroban RPC
```

## 5. Run Frontend (2 min)

In another terminal:

```bash
npm --workspace=frontend run dev
```

The frontend starts on `http://localhost:5173`. Open it in your browser.

## 6. Test the Stack (1 min)

1. Navigate to http://localhost:5173 in your browser
2. Click "Create Shipment"
3. Fill in origin, destination, cargo, and value
4. Submit the form
5. You should see the shipment appear in the list within a few seconds

**Congratulations!** You have a working local StellarSettle stack.

## Next Steps

### Understand the Architecture

Read the [full README](../README.md) for:
- Data structures and contract functions
- System architecture and component roles
- Deployment instructions for testnet/mainnet

### Learn Domain Terms

Check [GLOSSARY.md](./GLOSSARY.md) to understand shipment, milestone, arbiter, collateral, retainage, and other domain concepts.

### Make Your First Change

1. **Fix a bug**: Check [TODO.md](../TODO.md) for known issues
2. **Add a feature**: See [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md) for recently completed work
3. **Improve docs**: Update README, GLOSSARY, or add examples

For each change:
1. Create a branch: `git checkout -b feature/your-change`
2. Make your changes
3. Test locally: `npm test` (or `cargo test` for contracts)
4. Submit a PR

### Read Deeper Docs

- **Security Model**: [SECURITY.md](./SECURITY.md) — threat vectors and mitigations
- **Design Decisions**: [TECHNICAL_NOTES.md](./TECHNICAL_NOTES.md) — architecture and trade-offs
- **Testing**: [../E2E_AND_LOAD_TESTING.md](../E2E_AND_LOAD_TESTING.md) — E2E and load tests

## Troubleshooting

**Sandbox won't start**
```bash
# Reset Soroban state
soroban-cli sandbox reset
soroban-cli sandbox start
```

**Backend won't connect to RPC**
- Verify sandbox is running (`soroban-cli sandbox status`)
- Check backend logs for RPC URL (should be `http://localhost:8000`)

**Frontend shows "Connection Error"**
- Verify backend is running on port 3000
- Check browser console for errors (F12)
- Clear browser cache and reload

**Tests fail**
- Update contracts: `cd contracts && cargo update && cargo test`
- Clear Soroban state: `soroban-cli sandbox reset`
- Restart sandbox

## Getting Help

- **Questions about the domain?** → [GLOSSARY.md](./GLOSSARY.md)
- **Security concerns?** → [SECURITY.md](./SECURITY.md)
- **Technical details?** → [TECHNICAL_NOTES.md](./TECHNICAL_NOTES.md)
- **Full architecture?** → [README.md](../README.md)
- **Feature roadmap?** → [TODO.md](../TODO.md)

## Performance Tips

**Speed up builds**
```bash
# Use sccache for Rust compilation
cargo install sccache
export RUSTC_WRAPPER=sccache
```

**Speed up frontend dev**
```bash
# Use faster npm ci instead of npm install
npm --workspace=frontend ci
```

**Reduce memory usage**
- Run each component in its own terminal (don't run all at once)
- Increase Node memory if needed: `export NODE_OPTIONS=--max-old-space-size=4096`

---

**Ready to contribute?** Pick an issue from [TODO.md](../TODO.md) and make your first PR! 🚀
