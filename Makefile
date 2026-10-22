.PHONY: help test lint fmt dev clean build

# Default target
help:
	@echo "StellarSettle Development Commands"
	@echo "===================================="
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  test       Run tests for all packages (contracts, backend, frontend)"
	@echo "  lint       Run linters for all packages"
	@echo "  fmt        Format code in all packages (Rust, TypeScript)"
	@echo "  fmt-check  Check if code is formatted without making changes"
	@echo "  dev        Start all dev servers (contracts watcher, backend, frontend)"
	@echo "  build      Build all packages for production"
	@echo "  clean      Remove build artifacts and dependencies"
	@echo "  help       Show this help message"
	@echo ""
	@echo "Package-specific targets:"
	@echo "  test-contracts     Run contract tests only"
	@echo "  test-backend       Run backend tests only"
	@echo "  test-frontend      Run frontend tests only"
	@echo "  lint-contracts     Lint contracts (cargo clippy)"
	@echo "  lint-backend       Lint backend (cargo clippy)"
	@echo "  lint-frontend      Lint frontend (eslint, prettier)"
	@echo "  fmt-contracts      Format contracts (cargo fmt)"
	@echo "  fmt-backend        Format backend (cargo fmt)"
	@echo "  fmt-frontend       Format frontend (prettier)"
	@echo "  build-contracts    Build contracts only"
	@echo "  build-backend      Build backend only"
	@echo "  build-frontend     Build frontend only"
	@echo "  dev-contracts      Watch and rebuild contracts on changes"
	@echo "  dev-backend        Start backend dev server"
	@echo "  dev-frontend       Start frontend dev server"
	@echo ""

# =============================================================================
# Test Targets
# =============================================================================

test: test-contracts test-backend test-frontend
	@echo "✓ All tests passed"

test-contracts:
	@echo "Running contract tests..."
	cd contracts && cargo test

test-backend:
	@echo "Running backend tests..."
	cd backend && cargo test

test-frontend:
	@echo "Running frontend tests..."
	cd frontend && npm test -- --passWithNoTests

# =============================================================================
# Lint Targets
# =============================================================================

lint: lint-contracts lint-backend lint-frontend
	@echo "✓ All linters passed"

lint-contracts:
	@echo "Linting contracts..."
	cd contracts && cargo clippy -- -D warnings

lint-backend:
	@echo "Linting backend..."
	cd backend && cargo clippy -- -D warnings

lint-frontend:
	@echo "Linting frontend..."
	cd frontend && npm run lint

# =============================================================================
# Format Targets
# =============================================================================

fmt: fmt-contracts fmt-backend fmt-frontend
	@echo "✓ All code formatted"

fmt-check: fmt-check-contracts fmt-check-backend fmt-check-frontend
	@echo "✓ All code is properly formatted"

fmt-contracts:
	@echo "Formatting contracts..."
	cd contracts && cargo fmt

fmt-check-contracts:
	@echo "Checking contract formatting..."
	cd contracts && cargo fmt -- --check

fmt-backend:
	@echo "Formatting backend..."
	cd backend && cargo fmt

fmt-check-backend:
	@echo "Checking backend formatting..."
	cd backend && cargo fmt -- --check

fmt-frontend:
	@echo "Formatting frontend..."
	cd frontend && npm run format

fmt-check-frontend:
	@echo "Checking frontend formatting..."
	cd frontend && npm run format:check || npm run lint

# =============================================================================
# Build Targets
# =============================================================================

build: build-contracts build-backend build-frontend
	@echo "✓ All packages built"

build-contracts:
	@echo "Building contracts..."
	cd contracts && cargo build --release

build-backend:
	@echo "Building backend..."
	cd backend && cargo build --release

build-frontend:
	@echo "Building frontend..."
	cd frontend && npm run build

# =============================================================================
# Development Targets
# =============================================================================

dev: dev-backend dev-frontend
	@echo "✓ Dev servers started"

dev-contracts:
	@echo "Watching contracts (rebuild on change)..."
	cd contracts && cargo watch -x "build" -x "test"

dev-backend:
	@echo "Starting backend dev server (http://localhost:3001)..."
	cd backend && cargo run

dev-frontend:
	@echo "Starting frontend dev server (http://localhost:3000)..."
	cd frontend && npm run dev

# =============================================================================
# Utility Targets
# =============================================================================

clean:
	@echo "Cleaning build artifacts and node_modules..."
	cd contracts && cargo clean
	cd backend && cargo clean
	cd frontend && rm -rf node_modules dist build .next
	@echo "✓ Clean complete"

install:
	@echo "Installing all dependencies..."
	cd frontend && npm install
	@echo "✓ Dependencies installed"

# Parallel development: run multiple commands in parallel (requires GNU make)
# Usage: make dev-parallel
dev-parallel:
	@echo "Starting all dev servers in parallel..."
	@(cd backend && cargo run) & \
	(cd frontend && npm run dev) & \
	wait

# Continuous integration: run all checks (test, lint, fmt-check)
ci: fmt-check lint test
	@echo "✓ CI checks passed"
