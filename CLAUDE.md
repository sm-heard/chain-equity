# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChainEquity is an end-to-end prototype for an allowlist-gated equity token with corporate action migrations (stock splits, symbol changes), cap-table exports, and operator tooling. Built as a monorepo with five workspaces:

- **contracts** - Solidity smart contracts (Hardhat)
- **indexer** - Event indexer that populates SQLite with Transfer events
- **api** - Hono REST API for admin operations
- **cli** - Command-line admin tool
- **web** - Next.js admin dashboard with RainbowKit wallet integration

## Development Commands

### Initial Setup
```bash
npm install
# Create .env from .env.example with required values
```

### Building
```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run build -w @chainequity/contracts
npm run build -w @chainequity/api
npm run build -w @chainequity/cli
npm run build -w @chainequity/indexer
npm run build -w @chainequity/web
```

### Running Locally
```bash
# 1. Start Hardhat local node
npx hardhat node --hostname 127.0.0.1 --port 8545

# 2. Deploy contracts to local network
npm run deploy:local --workspace @chainequity/contracts

# 3. Start API server (development mode)
npm run dev:api

# 4. Start indexer (requires build first)
node apps/indexer/dist/index.js

# 5. Start web admin (optional)
npm run dev:web
```

### Testing
```bash
# Hardhat contract tests
npm run test --workspace @chainequity/contracts

# Integration tests (requires local node and built API)
npm run test:integration
```

Note: Integration tests may fail on macOS due to System Integrity Protection blocking socket creation. If this occurs, manually start Hardhat node on port 8546 before running tests.

### CLI Usage
CLI must be run from compiled output:
```bash
node apps/cli/dist/index.js status
node apps/cli/dist/index.js approve <wallet>
node apps/cli/dist/index.js revoke <wallet>
node apps/cli/dist/index.js mint <wallet> <amount>
node apps/cli/dist/index.js balance <wallet>
node apps/cli/dist/index.js export <block> --format csv
node apps/cli/dist/index.js split --ratio 7
node apps/cli/dist/index.js change-symbol <symbol> --name "New Name"
```

## Architecture

### Token Contract (GatedToken.sol)

ERC20 token with:
- Allowlist gating on transfers (both sender and recipient must be approved)
- AccessControl roles: `ALLOWLIST_MANAGER_ROLE`, `MINTER_ROLE`, `PAUSER_ROLE`
- Zero decimals (whole-share tokens)
- Pausable for corporate actions

Key functions:
- `setAllowlistStatus(address, bool)` - Approve/revoke wallet
- `mint(address, uint256)` - Mint tokens to approved wallet
- `pause()` / `unpause()` - Control transfers

### Indexer

- Polls chain for `Transfer` events using viem
- Maintains SQLite database with:
  - `holders` table (address -> balance)
  - `events` table (all Transfer logs)
  - `meta` table (last_processed_block, current_token_address)
- Batches events with configurable confirmation depth
- Must be restarted after corporate actions to track new token address

Database location: `apps/indexer/data/indexer.sqlite` (configurable via `INDEXER_DB_PATH`)

### API (Hono)

REST API with admin authentication via `x-admin-wallet` header. Endpoints:
- `GET /health` - Chain status
- `POST /approve` - Approve wallet
- `POST /revoke` - Revoke wallet
- `POST /mint` - Mint tokens
- `GET /balance/:wallet` - Check balance
- `GET /export` - Generate snapshot (JSON/CSV)
- `POST /split` - Perform stock split
- `POST /change-symbol` - Change symbol/name

Admin wallet validation: compares `x-admin-wallet` header against `ADMIN_WALLET` env var (case-insensitive).

### Corporate Actions (Migration System)

Located in `apps/api/src/services/migrations/`. Both splits and symbol changes follow the same pattern:

1. Pause original token
2. Generate snapshot of holders at current block
3. Deploy new token contract with updated symbol/name
4. Batch-approve all holders on new token
5. Mint adjusted balances (original × ratio for splits, 1:1 for symbol changes)
6. Update `meta.current_token_address` in indexer DB
7. Invalidate cached clients to point at new token

**Critical**: After a migration, restart the indexer and API processes so they track the new token address.

### Shared Infrastructure

Both API and CLI share:
- `env.ts` - Environment variable loading with validation
- `onchain.ts` - viem client initialization (publicClient, walletClient) with client caching and invalidation support
- ABI loading logic with multiple candidate paths for Hardhat artifacts

Token address resolution: Checks `current_token_address` in indexer DB first, falls back to `GATED_TOKEN_ADDRESS` env var.

### Web Admin

Next.js 15 app with:
- RainbowKit for wallet connection
- TanStack Query for API calls
- Snapshot viewer with CSV export
- Admin operations UI (approve, mint, corporate actions)

Requires wallet to match `NEXT_PUBLIC_ADMIN_WALLET` for admin operations.

## Environment Variables

Required in `.env` at repo root:
```env
RPC_URL=http://127.0.0.1:8545
SEPOLIA_PRIVATE_KEY=0x...
ADMIN_WALLET=0x...
GATED_TOKEN_ADDRESS=0x...
GATED_TOKEN_ABI_PATH=apps/contracts/artifacts/src/GatedToken.sol/GatedToken.json
INDEXER_DB_PATH=apps/indexer/data/indexer.sqlite
API_BASE_URL=http://localhost:8787
```

See `.env.example` for complete list including optional variables for Sepolia deployment.

## Common Workflows

### Fresh Deployment
1. Clean indexer DB: `rm apps/indexer/data/indexer.sqlite`
2. Start Hardhat node
3. Deploy: `npm run deploy:local -w @chainequity/contracts`
4. Update `.env` with new `GATED_TOKEN_ADDRESS`
5. Build all: `npm run build`
6. Start indexer and API

### Performing a Stock Split
1. Ensure indexer is running and synced
2. Call API: `POST /split` with `{"ratio": 7}`
3. Restart indexer and API to track new token
4. Old token is paused; all operations now target new token

### Debugging "Empty/0x response"
- Verify `GATED_TOKEN_ADDRESS` matches current deployment
- Check indexer DB has correct `current_token_address` after migrations
- Confirm ABI path points to correct Hardhat artifact

### macOS EPERM Issues
Run compiled builds (`node apps/.../dist/...`) instead of `npm run dev` when tsx IPC sockets fail due to System Integrity Protection.
