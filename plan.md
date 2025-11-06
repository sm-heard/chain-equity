# ChainEquity — Full Implementation Plan

This is the working plan to deliver the MVP per prd.md and ChainEquity.md. It’s broken into phases with detailed tasks and subtasks. Checkboxes reflect current completion status and what’s in progress.

---
## Status Summary (Today)

- [x] Confirm tech stack and decisions (Next 15, Hono, viem, wagmi, shadcn) — prd.md updated
- [x] Monorepo scaffolding (npm workspaces) with root scripts and .env.example
- [x] CLI app scaffold (TypeScript, commander, viem) with stub commands
- [x] Hono Admin API scaffold with routes and admin header check (stubs)
- [x] Indexer scaffold (SQLite schema, initial connect/write)
- [x] Web Admin (Next 15) scaffold with wagmi + RainbowKit + shadcn; Admin console page with forms wired to API
- [x] shadcn UI components installed via generator (button, input, label, card, table, separator)
- [x] Hydration/theme and WalletConnect config fixes
- [ ] Smart contracts (GatedToken) — PENDING
- [ ] API/CLI wired to contracts via viem wallet client — IN PROGRESS (core allowlist/mint wired)
- [ ] Indexer logs + snapshot export (CSV/JSON) — PENDING
- [ ] Corporate action migration flow (split + symbol change) — PENDING
- [ ] Foundry tests + gas reports — PENDING
- [ ] Sepolia deploy + Etherscan verification — PENDING

---
## Phase 0 — Setup & Planning

- [x] Align scope, goals, and stack
  - [x] Document decisions in prd.md (Hono, Node indexer, Sepolia, migration approach)
  - [x] Select versions: Next 15.5.x, wagmi 2.x, viem 2.x, RainbowKit 2.x
- [x] Repo structure
  - [x] Root `package.json` with npm workspaces (apps/*)
  - [x] .gitignore, .env.example, Makefile
- [x] Base apps scaffolding
  - [x] apps/cli — TypeScript, commander, viem
  - [x] apps/api — Hono + zod validator
  - [x] apps/indexer — viem + SQLite (better-sqlite3)
  - [x] apps/web — Next 15 + wagmi + RainbowKit + shadcn

---
## Phase 1 — Smart Contracts (Hardhat interim)

- [x] Initialize contracts workspace (Hardhat + TypeScript)
  - [x] `apps/contracts` package with Hardhat config, scripts, tests scaffolding
- [x] Implement GatedToken (Solidity 0.8.x)
  - [x] ERC20 base + `AccessControl` + `Pausable`
  - [x] Allowlist mapping + event `AllowlistUpdated`
  - [x] Override `_update` to enforce gating on transfer/transferFrom/mint/burn
  - [ ] Additional custom errors (`NotAdmin`, `InvalidRecipient`) — TODO if needed
  - [x] Roles: `DEFAULT_ADMIN_ROLE`, `ALLOWLIST_MANAGER_ROLE`, `MINTER_ROLE`, `PAUSER_ROLE`
  - [x] Decimals = 0 (whole-share token)
- [x] Provide Hardhat deploy script (`scripts/deploy.ts`)
- [ ] Tests (Hardhat)
  - [x] Added initial test suite covering mint, transfers, pause, burn
  - [ ] Execute tests once dependencies installed
  - [ ] Gas measurement (Hardhat / Foundry) — TODO
- [ ] Tooling
  - [ ] Document manual `npm install` for contracts workspace (network restricted)
  - [ ] Optional: introduce Foundry once available
- [ ] Deploy scripts
  - [x] Local (hardhat network): run script and capture addresses (0x5FbDB2315678afecb367f032d93F642f64180aa3)
  - [ ] Sepolia deployment instructions (after verification)
- [ ] Docs
  - [ ] Record addresses, ABIs, and links in README and prd.md

Deliverables: contract sources, tests, gas report, deployment scripts, verified source on Sepolia.

---
## Phase 2 — Issuer Service (Hono API) & CLI

- [x] viem wallet client setup (shared util)
  - [x] Read RPC + private key from env; create signer per environment
  - [x] Load contract address/ABI from deployment artifacts or env override
- [ ] Wire Admin API routes to on-chain ops
  - [x] POST /admin/approve — call allowlist function
  - [x] POST /admin/revoke — call revoke allowlist
  - [x] POST /admin/mint — enforce allowlisted recipient; call mint
  - [ ] POST /admin/split — orchestrate migration (see Phase 4)
  - [ ] POST /admin/change-symbol — orchestrate migration (see Phase 4)
  - [ ] GET /export?block=N — delegate to indexer snapshot (Phase 3)
  - [ ] Structured logging and error handling
- [ ] CLI commands mapped to same functions
  - [x] `approve <wallet>` / `revoke <wallet>`
  - [x] `mint <wallet> <amount>`
  - [ ] `transfer <fromKey> <to> <amount>` (demo helper)
  - [ ] `split --ratio 7:1` and `change-symbol <NEW>` (migration orchestration)
  - [ ] `export <block> --format csv|json`
  - [ ] `status` (addresses, last indexed block, paused state)
- [ ] Tests (Node)
  - [ ] Integration tests against Anvil for each route and CLI path

Deliverables: API/CLI performing real chain ops with proper validation and logging.

---
## Phase 3 — Indexer & Cap-Table Export

- [x] Event ingestion
  - [x] Poll confirmed blocks using viem `getLogs`
  - [x] Store events with block, tx hash, topics, data
  - [x] Maintain holder balances incrementally in SQLite
- [ ] Reorg handling
  - [x] Confirmation depth (configurable) before finalizing state
  - [ ] Rollback and reprocess on reorg (future enhancement)
- [x] Snapshot export (base)
  - [x] Build as-of block N snapshot (address, balance, ownership %)
  - [x] Reconcile balances vs on-chain at block N
  - [x] Export JSON/CSV via API and CLI/web wiring
- [ ] Snapshot export (enhanced)
  - [ ] Ownership rounding review & pagination for large sets
- [ ] Old→New continuity (migration)
  - [ ] Persist mapping from migration events and expose “current token”
- [ ] Tests
  - [ ] Anvil-based integration tests for indexing and export

Deliverables: deterministic exports in <10s after finality with reconciliation.

---
## Phase 4 — Corporate Actions (Migration)

- [x] Split 7:1 via migration
  - [x] Orchestrator: pause old token, pull holders from indexer, deploy new token, mint ×7 balances
  - [x] Persist new token address (meta + env) and log results
  - [x] CLI `/split` and API `/admin/split` invoke orchestrator
- [x] Symbol change via migration
  - [x] Deploy new token with new symbol; airdrop 1:1 balances
  - [x] Update metadata persistence and runtime config
  - [x] API `/admin/change-symbol` and CLI `change-symbol` invoke orchestrator

Deliverables: working demos for both actions, with events and continuity.

---
## Phase 5 — Web Admin (Next 15 + shadcn)

- [x] Provider stack & theme
  - [x] wagmi + RainbowKit wired (Alchemy/Injected)
  - [x] ThemeProvider + hydration suppression added
- [x] Admin console scaffolding
  - [x] Connect button + admin gating by connected wallet
  - [x] Forms for approve/revoke/mint/split/symbol change; snapshot export
  - [x] API client and feedback states
- [ ] UX improvements
  - [ ] Toast notifications (shadcn toaster)
  - [ ] Loading/disabled states polish; inline errors
  - [ ] Holder table wired to indexer data
  - [ ] Etherscan links for current token and latest txs

Deliverables: clean admin-only dashboard showcasing all flows.

---
## Phase 6 — Deployment & Verification

- [ ] Sepolia deployment
  - [ ] Configure env for deploy/signers (Alchemy keys, private key)
  - [ ] Deploy contracts; record addresses
  - [ ] Verify on Etherscan; publish ABIs and source
  - [ ] Update README with links
- [ ] Optional: Arbitrum Sepolia
  - [ ] Repeat deploy/verify and document

Deliverables: verified contracts and reproducible deployment notes.

---
## Phase 7 — Documentation & Demo

- [ ] README updates
  - [ ] One-command setup/run instructions
  - [ ] Addresses, ABIs, explorer links
  - [ ] Demo script steps (Alice/Bob/Carol)
- [ ] Technical writeup (1–2 pages)
  - [ ] Chain choice, migration approach, architecture decisions, limitations
- [ ] Gas report & performance metrics
  - [ ] Include Foundry gas snapshots; indexer latency notes
- [ ] Video demo (optional)

Deliverables: docs that enable anyone to run and evaluate the demo.

---
## Phase 8 — Quality & CI (Optional but Recommended)

- [ ] Linting/formatting
  - [ ] ESLint + Prettier configs across apps
- [ ] Type checking scripts
  - [ ] `npm run typecheck` per app
- [ ] GitHub Actions
  - [ ] CI for build, tests, and typecheck

---
## Environment & Versions

- Node: >= 20
- Web: Next 15.5.x, React 19, wagmi 2.x, viem 2.x, RainbowKit 2.x, shadcn (style: new‑york)
- API/CLI/Indexer: Node 20 + TypeScript, Hono, viem, better-sqlite3
- Chain: Sepolia via Alchemy (HTTP + WS)
- Contracts: Solidity 0.8.x, Foundry, OpenZeppelin

Key env vars
- Root: `ALCHEMY_API_KEY`, `SEPOLIA_PRIVATE_KEY`, `ETHERSCAN_API_KEY`, `INDEXER_DB_PATH`, `CONFIRMATIONS`
- Web (apps/web/.env.local): `NEXT_PUBLIC_ALCHEMY_API_KEY`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_ADMIN_WALLET`

---
## Definition of Done (MVP)

- All FRs in prd.md pass with tests
- Demo script runs end‑to‑end locally and on Sepolia
- Gas report documented; contracts verified on Etherscan
- Cap-table export reconciles on-chain balances at snapshot block
- Clear disclaimers about non‑production, non‑compliance

---
## Where We Are Now

- Web/Admin/API/CLI/Indexer scaffolds are in place; admin UI calls API successfully.
- Next big step: implement the Foundry contracts, then wire API/CLI to on-chain calls and ship indexer + snapshot logic.

---
## Next Actions (Proposed)

1) Contracts: scaffold Foundry + GatedToken, write tests, and produce gas report
2) Wire API/CLI to contracts via viem wallet client (local first, then Sepolia)
3) Implement indexer log ingestion + snapshot export and integrate into `/export`
4) Add migration orchestration for split and symbol change; update UI to surface results
5) Deploy to Sepolia and verify; update docs and demo script
