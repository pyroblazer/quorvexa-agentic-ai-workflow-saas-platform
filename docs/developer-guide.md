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

Optional for local LLM:
- **Ollama**: https://ollama.ai

---

## Quick Start (5 minutes)

All commands work on **Windows, macOS, and Linux** — no `make` required.

```bash
# 1. Clone the repository
git clone https://github.com/pyroblazer/quorvexa-agentic-ai-workflow-saas-platform
cd quorvexa-agentic-ai-workflow-saas-platform

# 2. Initial setup (copies .env files, installs deps)
pnpm setup

# 3. Edit .env — at minimum set JWT_SECRET and JWT_REFRESH_SECRET
#    Each service also has its own .env.example (auto-copied to .env by setup)

# 4. Start everything (stops old containers, starts infra, builds packages, runs all services)
pnpm dev
```

That's it — `pnpm dev` handles the full startup sequence:
1. Stops any previously running Docker containers (frees ports)
2. Starts infrastructure (Postgres, Redis, Qdrant, Kafka, RabbitMQ)
3. Waits for databases to be ready
4. Builds workspace packages
5. Starts all services in watch mode

> **Note:** In development mode, TypeORM auto-creates/updates tables (`synchronize: true`). No manual migrations needed.

After starting, the following URLs will be available:

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| Dev Playground | http://localhost:3000/dashboard/dev |
| API Gateway | http://localhost:4000 |
| API Docs | http://localhost:4000/api/docs |
| Auth service | http://localhost:3001 |
| Workflow service | http://localhost:3003 |
| AI Agent service | http://localhost:3005 |
| Prometheus | http://localhost:9090 (after `pnpm dev:obs`) |
| Grafana | http://localhost:3001 (after `pnpm dev:obs`) |
| Kibana | http://localhost:5601 (after `pnpm dev:obs`) |
| Jaeger | http://localhost:16686 (after `pnpm dev:obs`) |

---

## Default Admin Account

After running `pnpm dev`, seed the admin account:

```bash
pnpm seed
```

This creates a `super_admin` user with full platform access:

| Field | Value |
|-------|-------|
| Email | `admin@quorvexa.dev` |
| Password | `Qu0rv3xa!Admin` |
| Role | `super_admin` |
| Tenant | `default` |

### Logging In

1. Open http://localhost:3000
2. Click **Sign In** (top-right) or navigate to http://localhost:3000/auth/login
3. Enter the admin credentials above
4. You will be redirected to the dashboard

You can also log in directly from the Dev Playground — see below.

---

## Dev Playground

The Dev Playground is a **development-only** interactive sandbox at http://localhost:3000/dashboard/dev. It lets you exercise every API endpoint in the platform through pre-filled forms and one-click generate buttons. It is automatically hidden in production builds.

### Accessing the Playground

1. Start the stack: `pnpm dev`
2. Seed the admin account: `pnpm seed`
3. Log in at http://localhost:3000/auth/login with the admin credentials above
4. In the dashboard sidebar, click **Dev Playground** (only visible in development)
5. Or navigate directly to http://localhost:3000/dashboard/dev

### Tabs and Features

The playground is organized into 6 tabs:

#### Auth & Users

| Feature | Description |
|---------|-------------|
| **Quick Login (Admin)** | One-click login as the seeded admin account |
| **Login Form** | Log in with any email/password combination |
| **Generate Test User** | One-click registration of a random test user (`test-xxxxxx@quorvexa.io`) |
| **Register Form** | Register a new user with custom fields |
| **Refresh Token** | Refresh the current JWT access token |
| **Logout All Sessions** | Revoke all active sessions for the current user |
| **List Users** | Browse all registered users |
| **My Profile** | View the currently authenticated user's profile |
| **Suspend/Activate Me** | Toggle your own account status |
| **Create Profile** | Create a user profile with title, department, phone |

#### Workflows

| Feature | Description |
|---------|-------------|
| **Generate Sample Workflow** | One-click creation of a random workflow with auto-generated name and random trigger type |
| **Create Form** | Create a workflow with custom name, description, and trigger type (manual/scheduled/webhook/event) |
| **List All** | Browse all workflows |
| **Get Details** | Fetch a specific workflow by ID |
| **Activate** | Activate a workflow (enables triggering) |
| **Trigger Run** | Execute a workflow run |
| **Delete** | Remove a workflow |

Workflow IDs auto-populate from the last created workflow.

#### Notifications

| Feature | Description |
|---------|-------------|
| **Generate Sample Notification** | One-click send of a notification with random channel and auto-filled content |
| **Send Form** | Send a notification with custom channel (email/webhook/in_app/sms/slack), subject, body, and recipient |
| **List All / List Mine** | Browse all notifications or only yours |
| **Mark Read** | Mark a notification as read |
| **Retry Failed** | Retry a failed notification delivery |
| **Delete** | Remove a notification |

#### Templates (under Notifications tab)

| Feature | Description |
|---------|-------------|
| **Generate Sample Template** | One-click creation of a template with Handlebars variables (`{{name}}`, `{{slug}}`) |
| **Create Form** | Create a notification template with name, slug, subject, body template, and channel |
| **List All** | Browse all templates |
| **Render Template** | Provide variable values and see the rendered output (subject + body) |
| **Delete** | Remove a template |

#### AI Agents

| Feature | Description |
|---------|-------------|
| **Quick Run (Random Prompt)** | One-click agent execution with a randomly selected prompt |
| **Run Agent Form** | Run an agent with a custom prompt and optional session ID for multi-turn conversations |
| **Quick Embed (Sample)** | One-click embedding of sample content into the vector store |
| **Embed Content Form** | Embed custom text content for semantic search |
| **Search Memory Form** | Query the vector store with natural language |
| **List Tools** | View all available agent tools |

#### Preferences

| Feature | Description |
|---------|-------------|
| **Get Preferences** | View current user preferences |
| **Reset to Defaults** | Restore default preference values |
| **Update Form** | Change theme (light/dark/system), locale, timezone, and date format |

#### Simulation Guide

An 8-step guided walkthrough that exercises the full platform in order:

1. **Register a test user** — creates `dev-test@quorvexa.io`
2. **Login as the test user** — authenticates the new user
3. **View your profile** — fetches user profile
4. **Create a workflow** — builds a manual-trigger workflow
5. **Activate the workflow** — enables the workflow
6. **Trigger the workflow** — executes a run
7. **Send a notification** — sends an in-app notification
8. **Run an AI agent** — executes a prompt

Each step depends on the previous one completing. Steps can be executed individually or in sequence. The progress badge shows completion (N/8). Use **Reset** to start over.

### Generating Test Data

Every tab has one-click **Generate** buttons that create realistic sample data with random suffixes to avoid conflicts. These buttons:

- Auto-generate unique names, emails, and slugs
- Pick random trigger types, channels, and prompts
- Store all API responses in the playground's JSON viewer for inspection
- Auto-populate IDs in action fields (e.g., workflow ID after creation)

Use **Clear Responses** (top-right) to wipe all stored responses and start fresh.

---

## Environment Files

The platform uses a two-tier env setup:

| File | Purpose |
|------|---------|
| `.env` (root) | Shared vars used by all services (DB, Redis, JWT, Kafka, etc.) |
| `services/<name>/.env` | Service-specific vars (auto-copied from `.env.example` by `pnpm setup`) |
| `apps/web/.env` | Next.js `NEXT_PUBLIC_*` vars |
| `.env.example` (each level) | Template with defaults — safe to commit |

Running `pnpm setup` copies every `.env.example` to `.env` if it doesn't already exist. The root `.env` is the source of truth for shared secrets (JWT, database URL, Redis, etc.). Each service's `.env` contains the same vars scoped for standalone development.

**Required secrets to change before deploying:**
- `JWT_SECRET` — minimum 32 characters
- `JWT_REFRESH_SECRET` — minimum 32 characters
- `COOKIE_SECRET` — minimum 32 characters
- `ENCRYPTION_KEY` — minimum 32 characters

---

## All Commands

| Command | What it does |
|---------|-------------|
| `pnpm setup` | Copy .env files (root + services), install all Node + Python deps |
| `pnpm dev` | Stop old containers, start infra, build packages, run all services (watch mode) |
| `pnpm dev:infra` | Start only databases/brokers (Postgres, Redis, Qdrant, Kafka, RabbitMQ) |
| `pnpm dev:obs` | Start observability stack (Prometheus, Grafana, ELK, Jaeger) |
| `pnpm dev:full` | Full stack including observability |
| `pnpm docker:stop` | Stop all Docker containers (infra + obs) |
| `pnpm docker:up` | All services as Docker containers |
| `pnpm docker:down` | Stop main Docker containers |
| `pnpm docker:logs` | Tail Docker logs |
| `pnpm docker:build` | Build and start Docker containers |
| `pnpm build` | Build all packages and services |
| `pnpm test` | Run all tests |
| `pnpm test:unit` | Unit tests only (fast) |
| `pnpm test:integration` | Integration tests (needs running DB) |
| `pnpm test:e2e` | E2E tests (needs full stack running) |
| `pnpm test:api` | API tests with Newman/Postman |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm type-check` | TypeScript type checking |
| `pnpm format` | Format all code with Prettier |
| `pnpm clean` | Remove all build artifacts and node_modules |

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
pnpm test

# Unit tests only (fast, no infra needed)
pnpm test:unit

# Integration tests (needs running database)
pnpm dev:infra
pnpm test:integration

# E2E tests (needs full stack running)
pnpm dev
pnpm test:e2e

# API tests with Newman
pnpm test:api
```

---

## Debugging

### Service won't start

```bash
# Check environment variables (PowerShell)
Select-String -Path .env -Pattern "." | Where-Object { $_.Line -notmatch "^(#|$)" }

# Check if required ports are available (PowerShell)
netstat -ano | findstr "3001 3003 5432 6379"

# Check service logs
docker compose -f infra/docker/docker-compose.yml logs postgres
```

### Database connection issues

```bash
# Check migrations ran (requires psql on PATH)
psql $DATABASE_URL -c "SELECT * FROM typeorm_migrations ORDER BY timestamp DESC LIMIT 5;"
```

### AI agent not responding

```bash
# Check Ollama is running and model is available
curl http://localhost:11434/api/tags

# Test a direct completion
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"llama3\",\"messages\":[{\"role\":\"user\",\"content\":\"hello\"}]}"
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
