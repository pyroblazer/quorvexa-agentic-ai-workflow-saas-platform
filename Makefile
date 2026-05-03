.PHONY: all dev build test lint clean docker-up docker-down scan help

# Default shell
SHELL := /bin/bash

# Colors
RED    := \033[0;31m
GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
RESET  := \033[0m

## help: Show this help message
help:
	@echo ""
	@echo "$(BLUE)Quorvexa Enterprise SaaS Platform$(RESET)"
	@echo "$(YELLOW)Usage: make [target]$(RESET)"
	@echo ""
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'
	@echo ""

## setup: Initial project setup (copy env, install deps)
setup:
	@echo "$(GREEN)Setting up project...$(RESET)"
	@cp -n .env.example .env || true
	@pnpm install
	@echo "$(GREEN)Setup complete! Edit .env with your values.$(RESET)"

## dev: Start all services in development mode
dev:
	@echo "$(GREEN)Starting all services...$(RESET)"
	@docker compose -f infra/docker/docker-compose.yml up -d --force-recreate --remove-orphans postgres redis qdrant kafka zookeeper rabbitmq
	@sleep 5
	@pnpm turbo run dev --parallel

## dev:infra: Start only infrastructure (databases, message brokers)
dev\:infra:
	@echo "$(GREEN)Starting infrastructure services...$(RESET)"
	@docker compose -f infra/docker/docker-compose.yml up -d --force-recreate --remove-orphans postgres redis qdrant kafka zookeeper rabbitmq

## dev:obs: Start observability stack (Prometheus, Grafana, ELK)
dev\:obs:
	@echo "$(GREEN)Starting observability stack...$(RESET)"
	@docker compose -f infra/docker/docker-compose.obs.yml up -d --force-recreate --remove-orphans

## dev:full: Start everything including observability
dev\:full:
	@echo "$(GREEN)Starting full stack...$(RESET)"
	@docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.obs.yml up -d --force-recreate --remove-orphans

## build: Build all packages and services
build:
	@echo "$(GREEN)Building all services...$(RESET)"
	@pnpm turbo run build

## test: Run all tests
test:
	@echo "$(GREEN)Running all tests...$(RESET)"
	@pnpm turbo run test --parallel

## test:unit: Run unit tests only
test\:unit:
	@echo "$(GREEN)Running unit tests...$(RESET)"
	@pnpm turbo run test:unit --parallel

## test:integration: Run integration tests only
test\:integration:
	@echo "$(GREEN)Running integration tests...$(RESET)"
	@pnpm turbo run test:integration --parallel

## test:e2e: Run end-to-end tests
test\:e2e:
	@echo "$(GREEN)Running E2E tests...$(RESET)"
	@pnpm turbo run test:e2e

## test:api: Run API tests with Newman
test\:api:
	@echo "$(GREEN)Running API tests with Newman...$(RESET)"
	@npx newman run tests/api/postman-collection.json -e tests/api/postman-environment.json

## test:perf: Run performance tests with k6
test\:perf:
	@echo "$(GREEN)Running performance tests...$(RESET)"
	@k6 run tests/performance/k6-load-test.js

## lint: Run linter
lint:
	@echo "$(GREEN)Linting...$(RESET)"
	@pnpm turbo run lint --parallel

## lint:fix: Run linter with auto-fix
lint\:fix:
	@echo "$(GREEN)Fixing lint issues...$(RESET)"
	@pnpm turbo run lint:fix --parallel

## type-check: Run TypeScript type checking
type-check:
	@echo "$(GREEN)Type checking...$(RESET)"
	@pnpm turbo run type-check --parallel

## format: Format all code
format:
	@echo "$(GREEN)Formatting code...$(RESET)"
	@pnpm prettier --write "**/*.{ts,tsx,js,jsx,json,md,yml,yaml}"

## docker:build: Build and recreate all Docker services
docker\:build:
	@echo "$(GREEN)Building and starting Docker services...$(RESET)"
	@docker compose -f infra/docker/docker-compose.yml up -d --build --force-recreate --remove-orphans

## docker:up: Start all Docker services
docker\:up:
	@echo "$(GREEN)Starting Docker services...$(RESET)"
	@docker compose -f infra/docker/docker-compose.yml up -d --force-recreate --remove-orphans

## docker:down: Stop all Docker services
docker\:down:
	@echo "$(YELLOW)Stopping Docker services...$(RESET)"
	@docker compose -f infra/docker/docker-compose.yml down

## docker:logs: Show Docker service logs
docker\:logs:
	@docker compose -f infra/docker/docker-compose.yml logs -f

## scan: Run Trivy security scan
scan:
	@echo "$(GREEN)Running Trivy security scan...$(RESET)"
	@trivy fs . --exit-code 0 --severity HIGH,CRITICAL

## sbom: Generate Software Bill of Materials
sbom:
	@echo "$(GREEN)Generating SBOM...$(RESET)"
	@trivy fs . --format cyclonedx --output sbom.json

## migrate: Run database migrations
migrate:
	@echo "$(GREEN)Running migrations...$(RESET)"
	@pnpm --filter auth-service run migrate
	@pnpm --filter user-service run migrate
	@pnpm --filter workflow-service run migrate

## migrate:rollback: Rollback last migration
migrate\:rollback:
	@echo "$(YELLOW)Rolling back migrations...$(RESET)"
	@pnpm --filter auth-service run migrate:rollback
	@pnpm --filter user-service run migrate:rollback
	@pnpm --filter workflow-service run migrate:rollback

## seed: Seed database with sample data
seed:
	@echo "$(GREEN)Seeding database...$(RESET)"
	@pnpm --filter auth-service run seed
	@pnpm --filter user-service run seed
	@pnpm --filter workflow-service run seed

## clean: Clean all build artifacts
clean:
	@echo "$(YELLOW)Cleaning build artifacts...$(RESET)"
	@pnpm turbo run clean
	@find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
	@find . -name ".next" -type d -prune -exec rm -rf '{}' +
	@find . -name "dist" -type d -prune -exec rm -rf '{}' +
	@find . -name "coverage" -type d -prune -exec rm -rf '{}' +

## ci: Run full CI pipeline locally
ci: lint type-check test:unit test:integration build scan
	@echo "$(GREEN)CI pipeline completed successfully!$(RESET)"

## tf:init: Initialize Terraform
tf\:init:
	@cd infra/terraform && terraform init

## tf:plan: Run Terraform plan
tf\:plan:
	@cd infra/terraform && terraform plan

## tf:apply: Apply Terraform changes
tf\:apply:
	@cd infra/terraform && terraform apply

## tf:destroy: Destroy Terraform infrastructure
tf\:destroy:
	@echo "$(RED)WARNING: This will destroy all cloud infrastructure!$(RESET)"
	@read -p "Type 'yes' to confirm: " confirm && [ "$$confirm" = "yes" ] && cd infra/terraform && terraform destroy
