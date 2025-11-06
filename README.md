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

## Running Locally
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
3. Updated token address is stored in `meta.current_token_address` and applied to the runtime env; restart the indexer/API after each migration so they track the latest contract.

## Cap-table Export
- REST: `GET /export?block=<number>&format=json|csv`
- CLI: `node apps/cli/dist/index.js export <block>`
- Web admin card provides refresh/CSV download with live holder table.

## Troubleshooting
- **Empty/0x response** – ensure `.env` `GATED_TOKEN_ADDRESS` matches the current deployment and the indexer DB was cleaned after redeploy (`rm apps/indexer/data/indexer.sqlite`).
- **EPERM (macOS)** – run compiled binaries (`node apps/.../dist/...`) instead of `npm run dev` when tsx IPC sockets fail.
- **ABI lookups** – confirm `GATED_TOKEN_ABI_PATH` points at the Hardhat artifact (`apps/contracts/artifacts/src/GatedToken.sol/GatedToken.json`).

## Tests & Future Work
- Hardhat unit tests: `npm run test --workspace @chainequity/contracts`
- Integration migrations check: `npm run test:integration`
  - Requires a local Hardhat node on the configured `RPC_URL`. The script will attempt to launch its own node; if the OS blocks socket creation (macOS System Integrity Protection), start Hardhat manually (`npx hardhat node --hostname 127.0.0.1 --port 8546`) before running the test.
- Future work: automate `.env` updates after migrations, add end-to-end UI smoke tests.
