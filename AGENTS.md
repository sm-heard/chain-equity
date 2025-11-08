# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed by npm workspaces; all apps live under `apps/`.
- `apps/contracts` contains Hardhat sources and tests for the gated token.
- `apps/api` exposes the admin REST interface (`src/server.ts`) and ships compiled output in `dist/`.
- `apps/indexer` runs the SQLite-backed log ingestor; data files default to `apps/indexer/data/indexer.sqlite`.
- `apps/cli` publishes the admin CLI; run TypeScript from `src/` or compiled JavaScript from `dist/`.
- `apps/web` holds the admin UI; align API URLs with `.env` `API_BASE_URL`.

## Build, Test, and Development Commands
- `npm install` — install workspace dependencies.
- `npm run build -w @chainequity/cli` / `npm run build -w @chainequity/api` — compile CLI and API TypeScript.
- `npx hardhat node --hostname 127.0.0.1 --port 8545` — start the local chain required by the API, CLI, and tests.
- `npm run deploy:local --workspace @chainequity/contracts` — deploy the token to the local Hardhat node.
- `npm run dev:api` / `npm run dev:indexer` / `npm run dev:web` — launch core services for integrated demos.

## Coding Style & Naming Conventions
- TypeScript-first codebase using native ES modules; stick with `import`/`export` syntax.
- Indent with two spaces, keep lines under 120 characters, and favor descriptive camelCase identifiers.
- Configuration lives in `.env`; keep secrets out of source and refer to vars via the typed `env` helpers in each package.

## Testing Guidelines
- Smart contracts: `npm run test --workspace @chainequity/contracts` (Hardhat + Mocha). Ensure the Hardhat node matches `RPC_URL`.
- API integration: `npm run test:integration` after building the API; start a node on port `8546` if socket permissions block the test harness.
- Name new test files with `.test.ts` or `.test.mjs` alongside the code they cover; seed data with deterministic addresses from Hardhat fixtures.

## Commit & Pull Request Guidelines
- Craft commit subjects in present tense, high-signal summaries (e.g., `Implement stock split flow; persist token meta`). Expand detail in the body when needed.
- Squash small fixups before review; keep commits scoped to a single concern (API, CLI, contracts, etc.).
- Pull requests should describe the scenario, list affected workspaces, and note required env/config updates. Add screenshots or CLI samples when behavior changes.

## Security & Configuration Tips
- Copy `.env.example` to `.env` and update `RPC_URL`, `SEPOLIA_PRIVATE_KEY`, and `ADMIN_WALLET` before running any commands.
- Wipe stale indexer state (`rm apps/indexer/data/indexer.sqlite`) when redeploying contracts to avoid mismatched snapshots.
- Never commit private keys or SQLite artifacts; confirm `.gitignore` catches new generated files before opening a PR.
