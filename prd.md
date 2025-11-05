# ChainEquity – Tokenized Security Prototype (MVP) PRD

## 1) Overview
**Problem:** Private-company equity admin (cap tables, issuances, secondary transfers) is slow, manual, and opaque.  
**Solution:** A prototype showing tokenized equity with on‑chain transfer gating, simple corporate actions, and an operator workflow—purely for demonstration, not regulatory use.

## 2) Goals & Non‑Goals
**Goals**
- Prove an allowlist‑gated equity token and workflow end‑to‑end.
- Generate accurate “as‑of block” cap‑table exports.
- Demonstrate two corporate actions: **7‑for‑1 split** and **symbol/ticker change**.
- Provide both a CLI and a minimal admin‑only web interface, plus comprehensive tests.

**Non‑Goals**
- Real KYC/AML or jurisdictional rules.
- Production hardening, legal compliance, or real-money deployments.

## 3) Users & Primary Use Cases
**Issuer Admin/Operator**
- Approve/deny wallets; mint tokens; trigger corporate actions; export cap table.

**Investor (Approved Holder)**
- Receive tokens; transfer between other approved wallets.

## 4) Scope & Features (MVP)
1. **Gated Token Contract (ERC‑20 compatible)**
   - Transfer allowed only if **both** sender & recipient are on an allowlist.
   - Admin/Owner can add/remove wallets from allowlist.
   - Events for allowlist updates, transfers, approvals.
   - Minting only to allowlisted wallets; burning allowed only from allowlisted wallets.

2. **Issuer Service (Off‑Chain)**
   - Minimal API/CLI to approve/revoke wallets, mint (allowlisted only), query allowlist status, and orchestrate corporate actions.

3. **Event Indexer & Cap‑Table Export**
   - Index Transfer/Mint/Burn events; maintain balances; export CSV/JSON snapshots for any block.
   - Off‑chain mapping to relate pre‑ and post‑migration token addresses.

4. **Corporate Actions**
   - **7‑for‑1 Stock Split:** multiply balances by 7; preserve percentages; update total supply; emit action event; documented approach and trade‑offs.
   - **Symbol/Ticker Change:** preserve balances; update visible symbol; emit action event; documented approach.

5. **Operator Demo**
   - CLI driving the end‑to‑end happy path and failure cases; minimal web admin for the same actions (admin‑only).

6. **Approvals/Allowances**
   - Keep standard ERC‑20 approvals and `transferFrom` enabled; gating applies equally to `transfer`, `transferFrom`, mint, and burn.

## 5) Functional Requirements & Acceptance Criteria
**FR‑1 Gated Transfers**
- *AC1:* Transfer A→B reverts if A or B not allowlisted.
- *AC2:* Transfer succeeds when both are allowlisted.
- *AC3:* All allowlist changes emit events.

**FR‑2 Issuance**
- *AC1:* Admin can mint to allowlisted wallets only (enforced on‑chain).
- *AC2:* Unauthorized callers cannot mint/approve.

**FR‑3 Indexing & Snapshots**
- *AC1:* Export cap table at block *N* with (address, balance, %).
- *AC2:* Export at *N+10* reflects later changes.
- *AC3:* Export runs <10s after finality (local/testnet norms).
 - *AC4:* Indexer supports reorg tolerance via confirmation depth and can reprocess blocks.
 - *AC5:* Snapshot export reconciles computed balances against on‑chain `balanceOf` at block *N*.

**FR‑4 Corporate Actions**
- *Split:* After action, each holder’s balance is ×7; totalSupply reflects 7×; event includes ratio and timestamp.
- *Symbol Change:* New symbol visible in wallets/explorers per implementation; balances preserved; event includes old/new values.

**FR‑5 Operator Demo**
- *AC1:* Script/CLI shows: approve→mint→transfer success; transfer blocked for non‑approved; approve then retry; perform split; change symbol; export snapshot.

## 6) Success Metrics
- 0 false‑positive transfers (non‑allowlisted) and 0 false‑negative blocks (allowlisted).
- As‑of‑block cap‑table export works; split & symbol change demonstrated.
- Transfer confirmation time within testnet norms; indexer updates within 10s of finality.

## 7) Assumptions & Constraints
- Testnets/local only; no real funds.  
- “Compliance gating” is a basic allowlist only.  
- Token metadata changes may require migration depending on chain standards.

## 8) UX Notes
- **Minimal web admin is included in the MVP.** Admin-only dashboard to approve/revoke wallets, mint, view holders, trigger corporate actions (split & symbol change via migration), and export snapshots.
- Tech: Next.js + wagmi + RainbowKit; connects to Admin’s wallet; calls Issuer Service API.

UI details
- Admin wallet allowlist: UI gates access by checking connected wallet against an `ADMIN_WALLET` list.
- Links to Etherscan: Show verified contract pages and last tx hashes.
- Safety: Show “Transfers Paused” state during migrations.

## 9) Analytics/Telemetry
- Structured logs for admin actions and chain tx hashes; optional error reporting.

## 10) Rollout & Milestones
- **M1 (Week 1):** Contracts scaffold + allowlist; local e2e with Anvil; CLI basics.
- **M2 (Week 2):** Issuer CLI + indexer + CSV export; unit/integration tests; **minimal web admin** wired to CLI/API.
- **M3 (Week 3):** Corporate actions via **migration** (split & symbol change); demo script; gas report; README.
- **M4 (Week 4):** Deploy to **Sepolia**; Etherscan verification; optional deploy to **Arbitrum Sepolia**; demo video.

## 11) Risks & Mitigations
- **Gas for migrations:** keep holder count small in demo; batch airdrops; document costs.
- **Metadata mutability:** prefer migration path for symbol changes to ensure compatibility with explorers.
- **Indexer drift:** assert balances against on‑chain at end of export; integration tests.
 - **Reorgs:** use a confirmation depth (e.g., 5) before finalizing snapshots; reprocess on chain reorg events.

## 12) Decisions & Defaults (Confirmed)
1. **Chain:** **Ethereum Sepolia** (primary). Optional: Arbitrum Sepolia later.
2. **Interface:** **CLI and minimal web admin** (admin-only), both included in MVP.
3. **Holder count:** **≤ 10** wallets in demo.
4. **Corporate actions:** Use **migration** approach for both **7:1 split** and **symbol change** (pause → index balances → deploy new token → airdrop → emit events → deprecate old).
5. **Decimals:** **`decimals = 0`** (whole-share token) for easiest math & CSV; UI shows integers.
6. **CSV schema:** `wallet,balance,ownership_pct` (ownership rounded to **4 decimal places**).
7. **Admin:** **Single-sig** for MVP (roles via OZ AccessControl).
8. **Pause semantics:** Transfers **paused** during migrations—approved.
9. **Explorer visibility:** Target **Etherscan** (Sepolia). We will:
   - Obtain an **Etherscan API key**.
   - Verify contracts with Foundry `forge verify-contract` so source & ABI are published.
   - Emit structured events (split/symbol-change) so Etherscan decodes them.
   - Link the web admin to the verified contract page for demos.
10. **Demo script:** Use three named investors (**Alice, Bob, Carol**) + Issuer. Steps: approve + mint, blocked transfer (non-allowlisted) → approve → retry success, perform **7:1 split (via migration)**, **symbol change (via migration)**, export snapshots at **block N** and **N+10**.
11. **Approvals:** Keep ERC‑20 approvals/`transferFrom` enabled; gating applies universally.
12. **Provider:** **Alchemy** for HTTP+WebSocket.
13. **Indexer mapping:** Off‑chain mapping in the indexer for old→new token continuity.
14. **Indexer platform:** Node‑only (no The Graph) to simplify setup.
15. **Confirmations:** Use a default confirmation depth of **5 blocks** for snapshot finalization.

## 13) Third‑Party Services
- **Alchemy (recommended):** RPC + WebSocket provider for Sepolia; good DX and reliability. Optional: use Alchemy Webhooks for indexer triggers (we’ll still support polling).
- **thirdweb (optional):** Not required. Our token needs custom transfer‑gating, so OZ + custom extension is simpler. If desired, thirdweb can be used just for wallet UI components, but current plan uses wagmi/RainbowKit.

## 14) Etherscan Visibility – Requirements
- Deploy to **Sepolia** using a public RPC (Alchemy).
- Verify contracts (Foundry + Etherscan API key). This publishes bytecode metadata, ABI, and source so events are human‑readable.
- Include explicit events: `StockSplitAnnounced(oldToken,newToken,ratio,timestamp)` and `SymbolChanged(oldSymbol,newSymbol,timestamp)`.
- Add addresses & links to README for one‑click demos.

---
**Appendix A – Test Scenarios**
- Approve→Mint→Verify; Approved↔Approved transfer=SUCCESS; Approved→Non‑approved=FAIL; Non‑approved→Approved=FAIL; Revoke approval; Split 7:1; Change symbol; Export at N and N+10; Unauthorized admin actions=FAIL.

**Appendix B – Deliverables**
- Code repo, demo script/CLI, tests + gas report, deployment addresses (if any), setup scripts, decision log, limitations note.

---
## 15) Technical Design – Contracts
- Language/tooling: Solidity 0.8.x + Foundry + OpenZeppelin (ERC20, AccessControl, Pausable).
- Gating location: implement checks in `_update` so `transfer`, `transferFrom`, mint, and burn all enforce allowlist.
- Roles: `DEFAULT_ADMIN_ROLE`, `ALLOWLIST_MANAGER_ROLE`, `MINTER_ROLE`, `PAUSER_ROLE`.
- Custom events:
  - `event AllowlistUpdated(address indexed wallet, bool approved, address indexed operator);`
  - `event StockSplitExecuted(address indexed oldToken, address indexed newToken, uint256 numerator, uint256 denominator, uint256 timestamp);`
  - `event SymbolChanged(string oldSymbol, string newSymbol, uint256 timestamp);`
- Custom errors:
  - `error NotAllowlisted(address wallet);`
  - `error NotAdmin();`
  - `error TransfersPaused();`
  - `error InvalidRecipient(address wallet);`
- Mint/burn rules:
  - Mint only to allowlisted recipients; burn allowed only by/for allowlisted holders.
- Pausing:
  - `pause()` before migrations; `unpause()` after airdrop completes.

## 16) Technical Design – Indexer & Snapshots
- Platform: Node 20 + TypeScript with `viem` for RPC; SQLite (`better-sqlite3`) + Drizzle ORM for storage.
- Sources: Subscribe to Transfer/Mint/Burn; fallback to block polling when WS unavailable.
- Reorg handling: maintain a confirmation depth (default 5); do not finalize snapshots until confirmed; on reorg, roll back to last safe block and reprocess.
- Reconciliation: at export, query `balanceOf` for each holder at block N and assert equality with computed balances; fail export if mismatch unless `--force` is set.
- Holder discovery: use indexed events history to track current holders; during migration, use indexer’s last confirmed set as the airdrop source of truth.
- Old→new continuity: persist mapping when `StockSplitExecuted` is observed; UI and CLI surface “current token address”.

## 17) CLI & Admin API
- CLI (Node + TypeScript + `commander`):
  - `approve <wallet>` / `revoke <wallet>`
  - `mint <wallet> <amount>`
  - `transfer <fromKey> <to> <amount>` (for demos)
  - `split --ratio 7:1` (migration flow)
  - `change-symbol <NEW>` (migration flow)
  - `export <block> --format csv|json`
  - `status` (addresses, last indexed block, paused state)
- Admin API (Hono + `@hono/zod-validator` + `zod`): same operations exposed over REST for the web admin; authenticated by requiring the admin wallet signature or running on localhost during demos.

## 18) Web Admin (Minimal)
- Next.js 15 (app router) + wagmi v2 + RainbowKit + shadcn/ui (via `npx shadcn@latest`).
- Admin gating by wallet address; read-only views for non-admin.
- Actions: approve/revoke, mint, trigger split/symbol change, export snapshot; show live holder table.

## 19) Operations & Environment
- Provider: Alchemy HTTP+WS for Sepolia; local Anvil for development.
- Env vars (`.env.example`):
  - `ALCHEMY_API_KEY=...`
  - `SEPOLIA_PRIVATE_KEY=...` (demo key; never commit secrets)
  - `ETHERSCAN_API_KEY=...`
  - `ADMIN_WALLET=0x...`
  - `INDEXER_DB_PATH=./data/indexer.sqlite`
  - `CONFIRMATIONS=5`
- Makefile targets:
  - `make anvil` – start local chain
  - `make test` – run Foundry tests + gas report
  - `make deploy:local` / `make deploy:sepolia`
  - `make indexer` – run indexer locally
  - `make api` – run admin API
  - `make web` – run web admin
  - `make demo` – run scripted demo end‑to‑end

## 20) Testing & Gas
- Contracts: Foundry unit tests for gating, roles, mint/burn rules, and failure paths; integration tests for migration flows.
- Node: integration tests against Anvil for indexer exports and reconciliation.
- Gas targets (EVM): mint <100k; approve wallet <50k; gated transfer <100k; revoke <50k; symbol change <50k; split migration documented.
