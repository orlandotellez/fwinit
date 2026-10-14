# Developer command shortcuts for fwiflu.
# Run `make help` to list available targets.

.DEFAULT_GOAL := help
.PHONY: help setup get gen watch l10n format format-check analyze test coverage verify run run-staging run-prod clean upgrade

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: get gen l10n ## First-time setup: deps + codegen + localizations

get: ## Install dependencies
	flutter pub get

gen: ## Run build_runner once (freezed / json_serializable)
	dart run build_runner build

watch: ## Run build_runner in watch mode
	dart run build_runner watch

l10n: ## Generate localization classes from ARB files
	flutter gen-l10n

format: ## Format all Dart code
	dart format .

format-check: ## Verify formatting without writing changes
	dart format --output=none --set-exit-if-changed .

analyze: ## Run the static analyzer
	flutter analyze

test: ## Run the test suite
	flutter test

coverage: ## Run tests with coverage → coverage/lcov.info
	flutter test --coverage

verify: format-check analyze test ## Format check + analyze + test (CI gate)

run: ## Run the app with the dev flavor config
	flutter run --dart-define-from-file=config/dev.json

run-staging: ## Run the app with the staging flavor config
	flutter run --dart-define-from-file=config/staging.json

run-prod: ## Run the app with the prod flavor config
	flutter run --dart-define-from-file=config/prod.json

clean: ## Remove build artifacts and re-fetch deps
	flutter clean && flutter pub get

upgrade: ## Upgrade dependencies to latest allowed versions
	flutter pub upgrade
