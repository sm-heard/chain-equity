#!/usr/bin/env bash
set -euo pipefail

echo "[chain-equity] starting Hardhat node on 127.0.0.1:8545..."
npm exec -w @chainequity/contracts hardhat node -- --hostname 127.0.0.1 --port 8545 &
HH_PID=$!

cleanup() {
  echo "[chain-equity] shutting down Hardhat node..."
  kill "$HH_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[chain-equity] waiting for Hardhat node to accept connections..."
until node -e "require('net').connect(8545,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"; do
  sleep 0.5
done

echo "[chain-equity] deploying GatedToken to local node..."
npm run deploy:local -w @chainequity/contracts

echo "[chain-equity] starting services: API, indexer, web"
npm run dev:api &
API_PID=$!
npm run dev:indexer &
INDEXER_PID=$!
npm run dev:web &
WEB_PID=$!

wait $API_PID $INDEXER_PID $WEB_PID
