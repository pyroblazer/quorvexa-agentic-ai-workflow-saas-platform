# Developer Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| pnpm | 9+ | `npm install -g pnpm` |
| Docker | 24+ | https://docs.docker.com/get-docker/ |
| Docker Compose | 2.20+ | Bundled with Docker Desktop |
| Python | 3.11+ | https://python.org |
| Poetry | 1.8+ | `pip install poetry` |
| make | any | Bundled on Linux/macOS, `choco install make` on Windows |

Optional for local LLM:
- **Ollama**: https://ollama.ai

---

## Quick Start (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/quorvexa-platform.git
cd quorvexa-platform

# 2. Copy environment file and review it
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET and JWT_REFRESH_SECRET

# 3. Start infrastructure (databases, message brokers)
make dev:infra

# 4. Install all Node.js dependencies
pnpm install

# 5. Install Python dependencies
cd services/ai-agent-service && poetry install && cd ../..

# 6. Run database migrations
make migrate

# 7. Start all services in development mode
make dev
```

After starting, the following URLs will be available:

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| API Gateway | http://localhost:4000 |
| API Docs | http://localhost:4000/api/docs |
| Auth service | http://localhost:3001 |
| Workflow service | http://localhost:3003 |
| AI Agent service | http://localhost:3005 |
| Prometheus | http://localhost:9090 (after `make dev:obs`) |
| Grafana | http://localhost:3001 (after `make dev:obs`) |
| Kibana | http://localhost:5601 (after `make dev:obs`) |
| Jaeger | http://localhost:16686 (after `make dev:obs`) |

---

## Offline Mode (Local LLM)

To run AI features without internet access:

```bash
# 1. Start Ollama
docker compose -f infra/docker/docker-compose.yml --profile llm up -d ollama

# 2. Pull a local model (llama3 is ~5GB)
docker exec quorvexa-ollama ollama pull llama3

# 3. Set environment variables
# In .env:
LLM_PROVIDER=local
OPENAI_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3
```

For a smaller model on constrained hardware:
```bash
docker exec quorvexa-ollama ollama pull phi3:mini
# Then set LLM_MODEL=phi3:mini
```

---

## Running Tests

```bash
# All tests
make test

# Unit tests only (fast)
make test:unit

# Integration tests (needs running database)
make dev:infra
make test:integration

# E2E tests (needs full stack running)
make dev
make test:e2e

# API tests with Newman
make test:api

# Performance tests with k6
make test:perf
```

---

## Debugging

### Service won't start

```bash
# Check environment variables
cat .env | grep -v "^#" | grep -v "^$"

# Check if required ports are available
netstat -tlnp | grep -E "3001|3003|5432|6379"

# Check service logs
docker compose -f infra/docker/docker-compose.yml logs postgres
```

### Database connection issues

```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"

# Check migrations ran
psql $DATABASE_URL -c "SELECT * FROM typeorm_migrations ORDER BY timestamp DESC LIMIT 5;"
```

### AI agent not responding

```bash
# Check Ollama is running and model is available
curl http://localhost:11434/api/tags

# Test a direct completion
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3","messages":[{"role":"user","content":"hello"}]}'
```

### View distributed traces

1. Open http://localhost:16686 (Jaeger)
2. Select service from dropdown
3. Click "Find Traces"
4. Click any trace to see the full span tree

---

## Code Standards

### Naming

- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/methods: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Database columns: `snake_case` (mapped to camelCase in TypeORM)

### TypeScript

- Strict mode is on — no `any` without a comment explaining why
- Prefer `interface` over `type` for objects
- Always handle Promise rejections — use `void` prefix for fire-and-forget

### Comments

Write comments only when the WHY is non-obvious. Never write "this function does X" — the function name already says that. Do write:

```ts
// Argon2id is used instead of bcrypt because it's resistant to GPU attacks.
// The memory cost (64MB) makes parallel cracking expensive.
const hash = await argon2.hash(password, { memoryCost: 65536 });
```

---

## Architecture Decision Records (ADRs)

### ADR-001: Why microservices

**Decision**: Split into 5+ services from the start.

**Rationale**: The AI service (Python/FastAPI) cannot be collocated with Node.js services. Different scaling requirements per service. The spec requires microservices.

**Consequence**: More operational complexity than a monolith. Mitigated by Turborepo (unified DX) and Docker Compose (single-command local start).

### ADR-002: Why SSE over WebSockets

**Decision**: Use Server-Sent Events for real-time updates.

**Rationale**: Workflow execution is a server-push pattern — the server notifies the client about progress. SSE is one-directional (server → client), which is exactly what's needed. WebSocket's bidirectionality adds unnecessary complexity and sticky-session requirements.

**Consequence**: Client actions (trigger workflow, update task) still use REST. SSE handles the notification path only.

### ADR-003: Why Qdrant for vector storage

**Decision**: Qdrant over Pinecone, Weaviate, or pgvector.

**Rationale**: Qdrant is open-source, runs locally in Docker, has a Python client, and supports filtering on metadata (needed for multi-tenant vector search). pgvector would require fewer services but lacks horizontal scaling. Pinecone is cloud-only.

**Consequence**: Extra service to manage. Acceptable because it runs in Docker and the AI service abstracts the storage layer.
