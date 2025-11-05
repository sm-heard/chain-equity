.PHONY: anvil test deploy-local deploy-sepolia cli api indexer web demo

cli:
	@npm run dev:cli

api:
	@npm run dev:api

indexer:
	@npm run dev:indexer

web:
	@npm run dev:web

build:
	@npm run build

