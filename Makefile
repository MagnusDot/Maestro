PROJECT_NAME ?= salon-maestro
OUT_DIR ?= out
WRANGLER ?= npx wrangler
NPM ?= npm

.PHONY: help install dev typecheck build preview worker-dev worker-deploy pages-deploy deploy

help:
	@echo "Salon Maestro"
	@echo ""
	@echo "Targets:"
	@echo "  make install        Install dependencies"
	@echo "  make dev            Start Next.js + local room WebSocket server"
	@echo "  make typecheck      Run TypeScript checks"
	@echo "  make build          Build static Next.js output into $(OUT_DIR)"
	@echo "  make preview        Preview Cloudflare Pages locally"
	@echo "  make worker-dev     Run the Durable Object worker locally"
	@echo "  make worker-deploy  Deploy the Durable Object worker"
	@echo "  make pages-deploy   Deploy $(OUT_DIR) to Cloudflare Pages"
	@echo "  make deploy         Deploy worker, build app, deploy Pages"

install:
	$(NPM) install

dev:
	$(NPM) run dev

typecheck:
	$(NPM) run typecheck

build:
	$(NPM) run build

preview:
	$(NPM) run preview

worker-dev:
	$(NPM) run cf:worker:dev

worker-deploy:
	$(NPM) run cf:worker:deploy

pages-deploy:
	$(WRANGLER) pages deploy $(OUT_DIR) --project-name $(PROJECT_NAME) $(DEPLOY_FLAGS)

deploy: worker-deploy build pages-deploy
