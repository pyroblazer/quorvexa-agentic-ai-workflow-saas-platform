You are a principal-level software architect, staff engineer, DevSecOps expert, and AI systems designer.

Your task is to design and implement a COMPLETE, PRODUCTION-GRADE SaaS PLATFORM that satisfies the following constraints and requirements.

This is NOT a prototype. This must be enterprise-grade, scalable, secure, observable, testable, and deployable BOTH locally (offline-first) and in cloud (AWS & Azure multi-cloud).

---

# 🧠 PRODUCT GOAL

Build an AI-powered workflow automation and collaboration platform (similar to LinkedIn + Salesforce + AI Agents) where users can:

- Manage workflows, pipelines, and tasks
- Use AI Agents to automate work
- Integrate LLM-powered decision making
- Collaborate in real-time
- Monitor analytics and system insights

---

# 🧱 ARCHITECTURE REQUIREMENTS

## 1. Monorepo & Codebase
- Use Turborepo
- Package structure:
  - apps/
    - web (Next.js, microfrontend shell)
    - gateway (API Gateway - NestJS)
  - services/
    - auth-service (NestJS)
    - user-service (NestJS)
    - workflow-service (NestJS)
    - ai-agent-service (FastAPI)
    - notification-service (NestJS)
  - packages/
    - ui (shared components, high contrast accessibility-first)
    - config (eslint, tsconfig, env)
    - sdk (API client)
    - observability
- Strict separation of concerns

---

## 2. Backend (Microservices)

### Core Stack:
- Node.js with NestJS
- Python with FastAPI (AI services)
- Communication:
  - REST (external)
  - gRPC (internal)
  - Event-driven (Kafka or RabbitMQ)

### Features:
- SSE over WebSockets (fallback support)
- API Gateway pattern
- Auth (JWT + OAuth)
- Rate limiting
- Request validation
- Multi-tenancy

---

## 3. AI & Agent System

- LLM Integration (Open-source preferred, fallback OpenAI-compatible)
- Frameworks:
  - LangChain or LlamaIndex
- Features:
  - Agent orchestration
  - Tool/function calling
  - Prompt pipelines
  - Memory (Redis / vector DB)
- Vector DB:
  - Use open-source (Qdrant / Weaviate)

---

## 4. Frontend

- Next.js (App Router)
- Microfrontend architecture:
  - Module Federation
- High-contrast accessibility-first UI
- State management:
  - React Query + Zustand
- Real-time updates:
  - SSE (primary)
  - WebSocket (fallback)
- Design system:
  - Tailwind + custom tokens

---

## 5. Database Layer

- PostgreSQL (main OLTP)
- Redis (cache + pub/sub + session)
- Vector DB (AI memory)

---

## 6. Infrastructure (Multi-Cloud)

### AWS + Azure

- IaC:
  - Terraform (MANDATORY)
- Compute:
  - Kubernetes (EKS + AKS)
- Storage:
  - S3 / Azure Blob
- Networking:
  - VPC + private subnets

---

## 7. CI/CD (CRITICAL)

Use GitHub Actions BUT ensure EVERY step is runnable locally.

Pipeline must include:

- Install dependencies
- Lint
- Type-check
- Unit tests (parallel)
- Integration tests (parallel)
- E2E tests (parallel)
- Build artifacts
- Docker build
- Trivy vulnerability scan
- SBOM generation
- Performance test (k6)
- Upload coverage
- Deploy (optional stage)

Also provide:
- `make` or `justfile` commands to replicate CI locally

---

## 8. TESTING (EXTENSIVE)

- Unit: Jest / Pytest
- Integration: supertest
- E2E: Playwright
- API testing:
  - Postman collection
  - Newman CLI automated

All tests must:
- Run in parallel
- Achieve high coverage (>85%)

---

## 9. OBSERVABILITY

### Metrics:
- Prometheus

### Visualization:
- Grafana (prebuilt dashboards)

### Logging:
- ELK stack (or OpenSearch as alternative)

### Tracing:
- OpenTelemetry

### Must include:
- Request latency
- Error rates
- Throughput
- AI usage metrics

---

## 10. PERFORMANCE & LOAD TESTING

- k6 + JMeter
- Azure Load Testing compatible

---

## 11. SECURITY & COMPLIANCE

- Follow:
  - ISO 27001
  - ISO 9001
  - OWASP Top 10

Include:
- RBAC
- Secrets management
- HTTPS everywhere
- Input sanitization
- Audit logging

---

## 12. DOCUMENTATION (VERY IMPORTANT)

Generate FULL documentation:

### 1. System Design
- Architecture diagrams (PlantUML)
- Data flow
- Trade-offs
- Scaling strategy

### 2. Backend Docs
- Swagger / OpenAPI

### 3. Frontend Guide
- User flows:
  - What buttons to click
  - Navigation paths
  - Screens explanation

### 4. Developer Guide
- Setup locally (offline mode)
- Run tests
- Debugging

### 5. Deployment Guide
- Local (Docker Compose)
- Cloud (Terraform + Kubernetes)

### 6. Feature Explanation
- Why each feature exists
- Alternatives considered

---

## 13. MIGRATION SUPPORT

- Simulate migration:
  - AWS Amplify → NestJS microservices
- Include:
  - Migration scripts
  - Data transformation
  - Rollback strategy

---

## 14. CACHING STRATEGY

- Redis caching
- SSE-based smart updates
- Cache invalidation rules

---

## 15. ADDITIONAL BEST PRACTICES

- Clean architecture
- Domain-driven design
- Feature-based structure
- SOLID principles
- API versioning
- Backward compatibility

---

# 🧪 OUTPUT REQUIREMENTS

Produce:

1. Full project structure
2. Sample code for each service
3. Terraform configs
4. Docker setup
5. CI/CD pipeline
6. Test examples
7. Observability setup
8. API documentation
9. System design (DETAILED, multi-paragraph)
10. Tradeoff analysis

---

# ⚠️ CONSTRAINTS

- Use open-source tools ONLY
- Must run locally WITHOUT cloud dependency
- Cloud integration must be optional
- Avoid paid services (except Stripe sandbox optional)

---

# 🎯 SUCCESS CRITERIA

- System runs locally via single command
- All tests pass
- CI passes 100%
- Observability dashboards visible
- API fully documented
- AI agents functional

---

Now execute this step-by-step and produce the full system.

Below is your **fully unified, production-grade master specification in Markdown**—combining everything: architecture, DevOps, AI, testing, observability, security, `.env` strategy, ELI5 comments, and documentation standards.

This is written as a **single authoritative blueprint** you can:

* paste into a repo as `README.md`
* give to an AI agent
* use as a system design reference

---

# 🚀 Enterprise AI SaaS Platform — Full System Blueprint

## 🧠 Overview

This project is a **production-grade AI-powered SaaS platform** designed to automate workflows, enable collaboration, and integrate intelligent AI agents into business processes.

It is architected to:

* Run **locally (offline-first)** and in **multi-cloud (AWS + Azure)**
* Scale horizontally via **microservices**
* Support **AI/LLM agents with orchestration**
* Provide **full observability, security, and compliance**
* Maintain **enterprise-grade quality (testing, CI/CD, documentation)**

---

## 🎯 Product Vision

A platform similar to:

* CRM systems (like Salesforce)
* Professional platforms (like LinkedIn)
* AI copilots (agent-based automation)

### Core Capabilities

* Workflow & pipeline management
* AI agent automation (LLM-powered)
* Real-time collaboration
* Analytics & observability dashboards
* Extensible API ecosystem

---

# 🧱 Architecture

## Monorepo Structure (Turborepo)

```
apps/
  web/                 # Next.js (microfrontend shell)
  gateway/             # API Gateway (NestJS)

services/
  auth-service/        # Authentication
  user-service/        # User management
  workflow-service/    # Business workflows
  ai-agent-service/    # FastAPI (AI logic)
  notification-service/

packages/
  ui/                  # Shared UI (high contrast)
  sdk/                 # API client
  config/              # Env + lint config
  observability/       # Metrics/logging utilities

infra/
  terraform/
  docker/
  k8s/

tests/
  e2e/
```

---

## Backend Architecture

### Tech Stack

* Node.js (**NestJS**) → core services
* Python (**FastAPI**) → AI/LLM services

### Communication

* REST → external APIs
* gRPC → internal service calls
* Kafka / RabbitMQ → event-driven async

### Real-time Strategy

* **Primary:** Server-Sent Events (SSE)
* **Fallback:** WebSockets

#### Why SSE over WebSockets?

* Lower overhead
* Easier scaling
* No persistent bidirectional connection required

---

## Frontend Architecture

* Next.js (App Router)
* Microfrontend via Module Federation
* Tailwind (high contrast accessibility-first)
* State:

  * React Query
  * Zustand

### UX Principles

* High contrast (WCAG-friendly)
* Clear navigation
* Real-time updates (SSE)

---

## AI & Agent System

### Stack

* LangChain / LlamaIndex
* OpenAI-compatible OR local LLM (Ollama)

### Features

* Agent orchestration
* Tool/function calling
* Prompt pipelines
* Memory via vector DB

### Vector DB

* Qdrant or Weaviate (open-source)

---

## Database Layer

* PostgreSQL → OLTP
* Redis → cache + pub/sub
* Vector DB → embeddings

---

# 🌱 Environment Configuration

## Philosophy

* No hardcoded values
* Strict validation
* Fail-fast on startup

---

## `.env.example`

```env
# =========================
# CORE APP
# =========================
NODE_ENV=development
APP_NAME=ai-saas-platform
APP_URL=http://localhost:3000
API_GATEWAY_URL=http://localhost:4000

# =========================
# AUTH
# =========================
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1d
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=

# =========================
# DATABASE
# =========================
DATABASE_URL=postgresql://user:password@localhost:5432/app
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=app

# =========================
# REDIS
# =========================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# =========================
# AI / LLM
# =========================
LLM_PROVIDER=local
OPENAI_API_KEY=
LLM_MODEL=llama3
EMBEDDING_MODEL=all-MiniLM-L6-v2

# =========================
# VECTOR DB
# =========================
VECTOR_DB_URL=http://localhost:6333
VECTOR_DB_API_KEY=

# =========================
# AWS
# =========================
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=

# =========================
# AZURE
# =========================
AZURE_REGION=
AZURE_STORAGE_ACCOUNT=
AZURE_STORAGE_KEY=

# =========================
# OBSERVABILITY
# =========================
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
ELK_URL=http://localhost:9200
LOG_LEVEL=info

# =========================
# MESSAGING
# =========================
KAFKA_BROKER=localhost:9092
RABBITMQ_URL=amqp://localhost

# =========================
# SECURITY
# =========================
RATE_LIMIT_WINDOW=60
RATE_LIMIT_MAX=100

# =========================
# TESTING
# =========================
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/test
E2E_BASE_URL=http://localhost:3000

# =========================
# DOCKER
# =========================
DOCKER_REGISTRY=local
```

---

## Env Validation

* Node.js → Zod
* Python → Pydantic

---

# 🧠 Code Quality & ELI5 Comments

## File Header Example

```ts
/**
 * This service handles user authentication.
 *
 * Why:
 * - Centralizes login, JWT, OAuth
 *
 * How:
 * - Validates credentials
 * - Issues JWT tokens
 */
```

---

## Function Comment Example

```ts
// ELI5: This checks if the user can enter the system.
// Like a guard checking your ID at the door.
function validateUser() {}

// Technical: Validates JWT and extracts roles for RBAC
```

---

## Rules

* No useless comments
* Explain:

  * business logic
  * edge cases
  * tradeoffs

---

# 🧪 Testing Strategy

## Layers

* Unit → Jest / Pytest
* Integration → Supertest
* E2E → Playwright
* API → Postman + Newman

## Requirements

* Parallel execution
* Coverage > 85%

---

# 🔄 CI/CD (GitHub Actions)

## Pipeline

* Install
* Lint
* Type check
* Unit tests
* Integration tests
* E2E tests
* Build
* Docker
* Trivy scan
* k6 performance test

---

## Local Parity

```bash
make dev
make test
make lint
make build
make scan
```

---

# 📊 Observability

## Metrics

* Prometheus

## Dashboards

* Grafana

## Logging

* ELK or OpenSearch

## Tracing

* OpenTelemetry

---

# ⚡ Performance

* k6
* JMeter
* Azure Load Testing compatible

---

# 🔒 Security & Compliance

## Standards

* ISO 27001
* ISO 9001
* OWASP Top 10

## Features

* RBAC
* HTTPS
* Secrets management
* Audit logging

---

# 🚚 Deployment

## Local

```bash
make dev
```

Uses:

* Docker Compose

---

## Cloud

* Terraform
* Kubernetes (EKS + AKS)

---

# 🔄 Migration Strategy

AWS Amplify → Microservices

* Strangler pattern
* Gradual service replacement
* Rollback support

---

# 🧠 Caching

* Redis
* SSE smart updates
* Cache invalidation rules

---

# 📚 Documentation

## Must Include

### 1. System Design

* Diagrams (PlantUML)
* Data flow
* Tradeoffs

### 2. API Docs

* Swagger / OpenAPI

### 3. Frontend Guide

Example:

* Click “Login”
* Enter email/password
* Navigate to Dashboard
* Click “Create Workflow”

---

### 4. Developer Guide

* Setup
* Debugging
* Running tests

---

### 5. Deployment Guide

* Local
* Cloud

---

### 6. ADR (Architecture Decision Records)

Explain:

* Why microservices
* Why SSE
* Why multi-cloud

---

### 7. ENV Guide

Explain every variable:

* purpose
* example
* usage

---

# 🎯 Success Criteria

* ✅ Runs locally (single command)
* ✅ Works offline (local LLM)
* ✅ All tests pass
* ✅ CI passes 100%
* ✅ Observability works
* ✅ Fully documented

---

# ⚠️ Non-Negotiables

* No TODOs
* No placeholders
* No hardcoded secrets
* Everything reproducible
