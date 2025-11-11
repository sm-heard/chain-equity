# ChainEquity Prototype

End-to-end demo of an allowlist-gated equity token with corporate action migrations, cap-table exports, and operator tooling (CLI + web admin).

## Prerequisites
- Node.js 20+
- npm 10+
- [Hardhat](https://hardhat.org/) (already bundled locally)

## Initial Setup
```bash
npm install
```

Create `.env` at the repo root (examples in `.env.example`). Minimum values:
```env
RPC_URL=http://127.0.0.1:8545
SEPOLIA_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ADMIN_WALLET=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
GATED_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
GATED_TOKEN_ABI_PATH=apps/contracts/artifacts/src/GatedToken.sol/GatedToken.json
INDEXER_DB_PATH=apps/indexer/data/indexer.sqlite
API_BASE_URL=http://localhost:8787
```

## Quick Start (one command)

Start a local chain, deploy the contract, and launch the API, indexer, and web dashboard in one go:

```bash
npm run dev:all
```

What this does:
- Starts a Hardhat node on `127.0.0.1:8545` and waits until ready.
- Deploys `GatedToken` to the local node.
- Launches the Admin API (default `http://localhost:8787`), Indexer, and Web dashboard.

Notes:
- The default local deployment address is `0x5FbDB2315678afecb367f032d93F642f64180aa3`. If your deployed address differs (e.g., a non-fresh node), update `GATED_TOKEN_ADDRESS` in `.env` and, if needed, delete `apps/indexer/data/indexer.sqlite` once so the indexer/API rehydrate to the new contract.
- Stop everything with `Ctrl+C`; the script also shuts down the Hardhat node it started.

## Running Locally
If you prefer to run services manually:

1. **Hardhat node**
   ```bash
   npx hardhat node --hostname 127.0.0.1 --port 8545
   ```
2. **Deploy token**
   ```bash
   npm run deploy:local --workspace @chainequity/contracts
   ```
3. **Admin API**
   ```bash
   npm run dev:api
   ```
4. **Indexer (sqlite)**
   ```bash
   node apps/indexer/dist/index.js
   ```
5. **Web admin (optional)**
   ```bash
    npm run dev:web
    ```

## Compiled Builds (no tsx)

Build once, then run the compiled JavaScript for a demo without ts-node/tsx:

1. Build packages
   ```bash
   # Build everything
   npm -ws run build

   # Or build specific workspaces
   npm run build -w @chainequity/api
   npm run build -w @chainequity/indexer
   npm run build -w @chainequity/cli
   npm run build -w @chainequity/web
   ```

2. Start services (compiled)
   ```bash
   # Hardhat node (separate terminal)
   npx hardhat node --hostname 127.0.0.1 --port 8545

   # Deploy contract to local node
   npm run deploy:local --workspace @chainequity/contracts

   # API (compiled)
   npm run start -w @chainequity/api
   # or
   node apps/api/dist/server.js

   # Indexer (compiled)
   npm run start -w @chainequity/indexer
   # or
   node apps/indexer/dist/index.js

   # Web (compiled)
   npm run build -w @chainequity/web && npm run start -w @chainequity/web
   ```

3. CLI (compiled)
   ```bash
   # Examples
   node apps/cli/dist/index.js status
   node apps/cli/dist/index.js approve 0x...wallet
   node apps/cli/dist/index.js mint 0x...wallet 100
   node apps/cli/dist/index.js export 0 --format csv
   node apps/cli/dist/index.js split --ratio 3
   node apps/cli/dist/index.js change-symbol NEW --name "New Name"
   ```

## CLI Commands (compiled build)
```bash
node apps/cli/dist/index.js status
node apps/cli/dist/index.js approve 0x...wallet
node apps/cli/dist/index.js mint 0x...wallet 100
node apps/cli/dist/index.js export 0 --format csv
node apps/cli/dist/index.js split --ratio 7
node apps/cli/dist/index.js change-symbol NEW --name "New Name"
```

## Corporate Action Flow
1. **Split** – pauses original token, snapshots holders, deploys new contract, mints balances × ratio, persists new address.
2. **Symbol change** – same process with a 1:1 ratio and optional new name.
3. Updated token address is stored in `meta.current_token_address` and picked up automatically by the indexer, API, CLI, and dashboard. No service restarts or env edits are required—the migration resets the indexer state and switches everything over to the new contract.

## Cap-table Export
- REST: `GET /export?block=<number>&format=json|csv`
- CLI: `node apps/cli/dist/index.js export <block>`
- Web admin card provides refresh/CSV download with live holder table.

## Troubleshooting
- **Empty/0x response** – migrations now set the active token automatically. If you redeploy manually, update `.env` and delete `apps/indexer/data/indexer.sqlite`, otherwise the indexer will stick to the previous contract.
- **EPERM (macOS)** – run compiled binaries (`node apps/.../dist/...`) instead of `npm run dev` when tsx IPC sockets fail.
- **ABI lookups** – confirm `GATED_TOKEN_ABI_PATH` points at the Hardhat artifact (`apps/contracts/artifacts/src/GatedToken.sol/GatedToken.json`).

## Tests & Future Work
- Hardhat unit tests: `npm run test --workspace @chainequity/contracts`
- Integration migrations check: `npm run test:integration`
  - Requires a local Hardhat node on the configured `RPC_URL`. The script will attempt to launch its own node; if the OS blocks socket creation (macOS System Integrity Protection), start Hardhat manually (`npx hardhat node --hostname 127.0.0.1 --port 8546`) before running the test.
- Future work: automate `.env` updates after migrations, add end-to-end UI smoke tests.
