# Quorvexa — Enterprise AI Workflow Platform

A production-grade AI-powered SaaS platform for workflow automation, collaboration, and intelligent agent orchestration.

## Quick Start

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET and JWT_REFRESH_SECRET

make dev:infra    # Start databases and brokers
pnpm install      # Install Node.js dependencies
make migrate      # Run database migrations
make dev          # Start all services
```

**Access:**
- App: http://localhost:3000
- API: http://localhost:4000
- API Docs: http://localhost:4000/api/docs

## Architecture

```
apps/
  web/              Next.js 15 frontend (port 3000)
  gateway/          NestJS API Gateway (port 4000)
services/
  auth-service/     Authentication (port 3001)
  user-service/     User management (port 3002)
  workflow-service/ Workflow engine (port 3003)
  notification-service/ (port 3004)
  ai-agent-service/ FastAPI LLM service (port 3005)
packages/
  ui/               Shared WCAG-AA component library
  sdk/              API client
  observability/    Prometheus, OpenTelemetry, Pino
  config/           Shared tsconfig, eslint
infra/
  docker/           Docker Compose (local + observability)
  terraform/        AWS + Azure IaC
  k8s/              Kubernetes manifests
tests/
  e2e/              Playwright tests
  api/              Postman collection + Newman
  performance/      k6 load tests
docs/               Full documentation
```

## Commands

| Command | Description |
|---------|-------------|
| `make dev:infra` | Start PostgreSQL, Redis, Qdrant, Kafka |
| `make dev` | Start all services in watch mode |
| `make dev:obs` | Start Prometheus, Grafana, ELK, Jaeger |
| `make test` | Run all tests |
| `make test:unit` | Run unit tests |
| `make test:integration` | Run integration tests |
| `make test:e2e` | Run Playwright E2E tests |
| `make test:perf` | Run k6 load tests |
| `make test:api` | Run Postman collection via Newman |
| `make lint` | Lint all code |
| `make type-check` | TypeScript type checking |
| `make build` | Build all services |
| `make scan` | Trivy security scan |
| `make sbom` | Generate SBOM (CycloneDX) |
| `make ci` | Full CI pipeline locally |
| `make docker:up` | Start all services via Docker |
| `make tf:plan` | Terraform plan (cloud) |
| `make tf:apply` | Apply Terraform (cloud) |

## Observability (after `make dev:obs`)

| Tool | URL | Credentials |
|------|-----|-------------|
| Grafana | http://localhost:3001 | admin/admin |
| Prometheus | http://localhost:9090 | — |
| Kibana | http://localhost:5601 | — |
| Jaeger | http://localhost:16686 | — |
| RabbitMQ | http://localhost:15672 | quorvexa/quorvexa_pass |

## Local LLM (Offline AI)

```bash
docker compose -f infra/docker/docker-compose.yml --profile llm up -d ollama
docker exec quorvexa-ollama ollama pull llama3

# In .env:
LLM_PROVIDER=local
OPENAI_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind, Zustand, React Query |
| Gateway | NestJS, HTTP Proxy Middleware |
| Backend | NestJS, TypeORM, PostgreSQL |
| AI | FastAPI, LangChain, Ollama/OpenAI, Qdrant |
| Messaging | Kafka, RabbitMQ |
| Cache | Redis |
| Auth | JWT (argon2id), OAuth 2.0 |
| Observability | Prometheus, Grafana, ELK, Jaeger, OpenTelemetry |
| Infrastructure | Terraform, Kubernetes (EKS + AKS), Docker Compose |
| CI/CD | GitHub Actions, Trivy, k6 |
| Testing | Jest, Pytest, Playwright, Postman/Newman |

## Security

- OWASP Top 10 mitigations
- JWT with short expiry (15min) + rotating refresh tokens
- argon2id password hashing (memory-hard, GPU-resistant)
- Account lockout after 5 failed attempts
- Rate limiting per IP and per endpoint
- Helmet.js security headers
- Input validation with class-validator (whitelist mode)
- Audit log for all auth events
- Multi-tenant isolation at application and database level

## Documentation

- [System Design](docs/system-design.md)
- [Developer Guide](docs/developer-guide.md)
- [Frontend User Guide](docs/frontend-user-guide.md)
- [Deployment Guide](docs/deployment-guide.md) (Docker, AWS EKS, Azure AKS)
- [Production Deployment Guide](docs/production-deployment-guide.md) (Vercel + Supabase + SaaS)

## License

MIT
