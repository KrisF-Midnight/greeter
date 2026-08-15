# Thin by design. The verbs a developer needs on this repository are the app's
# own inner loop plus one delegation to the platform, which is the honest
# measure of how much of the road an application team has to understand.

SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

# Where the platform is checked out. Sibling directories are how the two repos
# sit on a laptop; CI checks tarmac out itself and never uses this.
TARMAC ?= ../tarmac

.PHONY: help dev test typecheck ci

help: ## Show the available targets
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

dev: ## Run the app with hot reload
	@bun run dev

test: ## Run the app's unit tests
	@bun test

typecheck: ## Typecheck the app
	@bun run typecheck

# Deliberately not a copy of the CI steps. It is the same entrypoint, so a green
# run here means the same thing a green run on the pull request means.
ci: ## Run the platform's gates against this repo, exactly as CI does
	@test -d $(TARMAC) || { \
		echo "platform not found at $(TARMAC)."; \
		echo "clone it beside this repo, or set TARMAC=<path>"; exit 1; }
	@$(MAKE) -C $(TARMAC) ci APP_DIR=$(CURDIR)
