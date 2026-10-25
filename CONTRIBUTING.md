# Contributing to StellarSettle

Thank you for your interest in contributing to StellarSettle! This guide covers how to set up your development environment, run tests, and submit changes.

## Table of Contents

- [Development Setup](#development-setup)
- [Running Tests](#running-tests)
- [Code Style & Formatting](#code-style--formatting)
- [Pre-commit Hooks](#pre-commit-hooks)
- [Making Changes](#making-changes)
- [Troubleshooting](#troubleshooting)

---

## Development Setup

### Prerequisites

- **Rust 1.70+** - Install from https://rustup.rs/
- **Node.js 18+** - Install from https://nodejs.org/
- **Docker** (optional, for local testing) - Install from https://www.docker.com/

### Clone & Install

```bash
git clone https://github.com/Kingsman-99/stellarsettle.git
cd stellarsettle

# Install frontend dependencies
cd frontend && npm install && cd ..

# Verify Rust setup
cd contracts && cargo build && cd ..
cd backend && cargo build && cd ..
```

### Environment Setup

Create a `.env` file in the root directory:

```bash
# Backend (see backend/README.md for full config)
DATABASE_URL=postgresql://user:pass@localhost:5432/stellarsettle
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
PORT=3001

# Frontend (see frontend/README.md for full config)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_NETWORK=testnet
```

---

## Running Tests

### Run All Tests

```bash
make test
```

### Run Tests by Package

```bash
# Contracts
make test-contracts

# Backend
make test-backend

# Frontend
make test-frontend
```

### Watch Mode (Contracts Only)

```bash
make dev-contracts
```

---

## Code Style & Formatting

### Format All Code

```bash
make fmt
```

### Check Formatting (Without Changes)

```bash
make fmt-check
```

### Format by Package

```bash
make fmt-contracts    # Rust: cargo fmt
make fmt-backend      # Rust: cargo fmt
make fmt-frontend     # TypeScript: prettier
```

### Lint All Code

```bash
make lint
```

### Lint by Package

```bash
make lint-contracts   # cargo clippy
make lint-backend     # cargo clippy
make lint-frontend    # eslint
```

---

## Pre-commit Hooks

Pre-commit hooks automatically run linters and formatters before each commit, catching issues early.

### Installation

1. **Install pre-commit framework:**
   ```bash
   pip install pre-commit
   ```

2. **Install the git hook into this repository:**
   ```bash
   pre-commit install
   ```

3. **Verify installation:**
   ```bash
   git commit --allow-empty -m "Test pre-commit" 2>&1 | grep -q "cargo fmt" && echo "✓ Hooks installed"
   ```

### What Gets Checked

On every `git commit`, the hooks will:

- **Rust (contracts + backend):**
  - Run `cargo fmt --check` (formatting)
  - Run `cargo clippy` (linting)

- **TypeScript (frontend):**
  - Run `eslint --fix` (linting)
  - Run `prettier` (formatting)

- **Markdown:**
  - Fix trailing whitespace
  - Fix missing final newline

### If a Hook Fails

If a pre-commit hook fails:

1. **Fix the issues:**
   ```bash
   # For Rust code
   make fmt-contracts && make fmt-backend

   # For TypeScript code
   make fmt-frontend && make lint-frontend
   ```

2. **Stage the fixes:**
   ```bash
   git add .
   ```

3. **Try committing again:**
   ```bash
   git commit -m "Your message"
   ```

### Running Hooks Manually

To check all files without committing:

```bash
pre-commit run --all-files
```

To run a specific hook:

```bash
pre-commit run cargo-fmt --all-files
pre-commit run eslint --all-files
```

### Bypassing Hooks (Not Recommended)

If you absolutely need to skip hooks for a commit:

```bash
git commit --no-verify -m "Your message"
```

⚠️ **Warning:** Skipping hooks may cause CI/CD to fail. Only do this if you plan to fix the issues before pushing.

### Troubleshooting Pre-commit

**Hooks not running after install:**
```bash
# Reinstall the hook
pre-commit install

# Verify hook script exists
ls -la .git/hooks/pre-commit
```

**"command not found" errors:**
- Ensure `cargo` and `npm` are in your PATH
- Run from the repository root directory

**Slow hook execution:**
- Hooks cache results; first run is slowest
- Run `pre-commit clean` to clear cache if issues occur

---

## Making Changes

### Branch Naming

Use descriptive branch names:

```bash
git checkout -b feature/add-settlement-ui
git checkout -b fix/handle-network-errors
git checkout -b docs/update-readme
```

### Commit Messages

Write clear, concise commit messages:

```
Add support for multi-signature settlements

- Implement multisig proposal voting
- Add smart contract validation
- Update UI to show pending approvals

Closes #123
```

### Before Pushing

1. **Run pre-commit hooks:**
   ```bash
   pre-commit run --all-files
   ```

2. **Run CI checks locally:**
   ```bash
   make ci  # Runs: fmt-check, lint, test
   ```

3. **Build for production:**
   ```bash
   make build
   ```

4. **Push to your fork:**
   ```bash
   git push origin your-branch-name
   ```

5. **Open a Pull Request** on GitHub

---

## Troubleshooting

### Dependencies Missing

**Error:** `error: linker 'cc' not found`

```bash
# macOS
brew install gcc

# Ubuntu/Debian
sudo apt-get install build-essential
```

**Error:** `Cannot find module 'react'`

```bash
cd frontend && npm install
```

### Port Already in Use

**Error:** `Error: listen EADDRINUSE :::3000`

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use a different port
PORT=3002 npm run dev
```

### Cargo Build Fails

**Error:** `linker 'lld-link' not found`

```bash
# Update Rust
rustup update

# Clean and rebuild
cargo clean
cargo build
```

### Pre-commit Issues

See [Pre-commit Hooks Troubleshooting](#troubleshooting-pre-commit) above.

---

## Questions?

- Check the troubleshooting guide above
- Read the specific README files:
  - `backend/README.md` - Backend setup
  - `frontend/README.md` - Frontend setup
  - `contracts/README.md` - Contract development
- Open an issue on GitHub

---

## Code of Conduct

Be respectful, inclusive, and professional. We welcome all contributors!
