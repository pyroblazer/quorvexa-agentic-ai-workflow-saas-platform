# Production Deployment Guide — Vercel + Supabase + SaaS

This guide covers deploying the Quorvexa platform to production using Vercel (web + API), Supabase (Postgres + pgvector), and managed SaaS providers for everything else.

## Architecture

```
Vercel (Serverless)                    External SaaS
┌─────────────────────────┐            ┌──────────────────┐
│  Web (Next.js)          │            │  Supabase        │
│  quorvexa-taupe         │            │  Postgres + pgv  │
│         │               │            └────────┬─────────┘
│         ▼               │                     │
│  API Gateway (NestJS)   │──── DB ─────────────┘
│  quorvexa-api-gateway   │
│    │    │    │    │      │            ┌──────────────────┐
│    ▼    ▼    ▼    ▼      │            │  Upstash Redis   │
│  Auth  User Work. Notif. │            │  Groq (LLM)      │
│  NestJS services         │            │  CloudAMQP       │
└─────────────────────────┘            │  Resend (Email)  │
                                       │  Grafana Cloud   │
Render (Container)                     └──────────────────┘
┌─────────────────────────┐
│  AI Agent (FastAPI)      │
│  quorvexa-agentic-ai-   │
│  workflow-saas           │
└─────────────────────────┘
```

## Production URLs

| Service | URL |
|---------|-----|
| Web App | `https://quorvexa-taupe.vercel.app` |
| API Gateway | `https://quorvexa-api-gateway.vercel.app` |
| Auth Service | `https://quorvexa-auth-service.vercel.app` |
| User Service | `https://quorvexa-user-service.vercel.app` |
| Workflow Service | `https://quorvexa-workflow-service.vercel.app` |
| Notification Service | `https://quorvexa-notification-service.vercel.app` |
| AI Agent Service | `https://quorvexa-agentic-ai-workflow-saas.onrender.com` |

---

## Step 1: Supabase Database Setup

The Supabase project is already configured with all tables and migrations.

### Run Migrations

The migration files are in `infra/supabase/migrations/`. They have already been applied. If you ever need to re-run them:

1. Go to **Supabase Dashboard** (`https://supabase.com/dashboard`)
2. Select the `<your-project>` project
3. Click **SQL Editor** in the left sidebar
4. Open each migration file from `infra/supabase/migrations/` in order (001 through 008)
5. Paste the SQL and click **Run**

Migration order:
1. `001_enable_pgvector.sql` — Enables the `vector` extension
2. `002_create_match_documents_rpc.sql` — Creates the `match_documents` function for cosine similarity search
3. `003_create_enum_types.sql` — Creates all enum types (user_role, workflow_status, etc.)
4. `004_create_auth_tables.sql` — `users`, `refresh_tokens`, `audit_logs`
5. `005_create_user_tables.sql` — `user_profiles`, `user_preferences`
6. `006_create_notification_tables.sql` — `notifications`, `notification_templates`
7. `007_create_workflow_tables.sql` — `workflows`, `workflow_steps`
8. `008_create_vector_table.sql` — `quorvexa_embeddings` with HNSW index

### Seed Admin Account

```bash
cd services/auth-service
node src/database/seeds/seed-admin.js
```

This creates a `super_admin` account:
- Email: `admin@quorvexa.dev`
- Password: `Qu0rv3xa!Admin`

---

## Step 2: Deploy Backend Services to Vercel

Each NestJS service is deployed as a separate Vercel project. The `vercel.json` and `api/index.ts` files are already in the repo.

### For each service, follow these steps:

#### 2A. Create the Vercel Project

1. Go to **[Vercel Dashboard](https://vercel.com/dashboard)**
2. Click **Add New...** → **Project**
3. Under **Import Git Repository**, find `pyroblazer/quorvexa-agentic-ai-workflow-saas-platform`
4. Click **Import**

#### 2B. Configure the Project

You'll see the **Configure Project** page. Set the following:

1. **Project Name** — Use the names in the table below (this determines the URL)
2. **Framework Preset** — Select **Other** from the dropdown
3. **Root Directory** — Click **Edit** and type the path from the table below
4. **Build Command** — Toggle **Override** and leave it — the `vercel.json` handles this
5. **Install Command** — Toggle **Override** and leave it — the `vercel.json` handles this
6. **Output Directory** — Leave empty

> **Important:** The `vercel.json` in each service directory already contains the correct `buildCommand` and `installCommand` with `corepack enable && pnpm install`. Do NOT override these in the dashboard.

#### 2C. Add Environment Variables

On the same Configure Project page, expand **Environment Variables**. Add each variable from the table below for the specific service.

Click **Deploy** when done.

---

### Service 1: API Gateway

| Setting | Value |
|---------|-------|
| **Project Name** | `quorvexa-api-gateway` |
| **Framework Preset** | Other |
| **Root Directory** | `apps/gateway` |

**Environment Variables:**

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | `55754cfc5162971fb561bd7c34a890f9197d987b11409b9cd2ab7fc74be3f767` |
| `AUTH_SERVICE_URL` | `https://quorvexa-auth-service.vercel.app` |
| `USER_SERVICE_URL` | `https://quorvexa-user-service.vercel.app` |
| `WORKFLOW_SERVICE_URL` | `https://quorvexa-workflow-service.vercel.app` |
| `NOTIFICATION_SERVICE_URL` | `https://quorvexa-notification-service.vercel.app` |
| `AI_AGENT_SERVICE_URL` | `https://quorvexa-agentic-ai-workflow-saas.onrender.com` |
| `CORS_ORIGINS` | `https://quorvexa-taupe.vercel.app,https://quorvexa-api-gateway.vercel.app,https://quorvexa-auth-service.vercel.app,https://quorvexa-user-service.vercel.app,https://quorvexa-workflow-service.vercel.app,https://quorvexa-notification-service.vercel.app` |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX` | `100` |
| `LOG_LEVEL` | `info` |

---

### Service 2: Auth Service

| Setting | Value |
|---------|-------|
| **Project Name** | `quorvexa-auth-service` |
| **Framework Preset** | Other |
| **Root Directory** | `services/auth-service` |

**Environment Variables:**

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://postgres:<password>@<host>.supabase.co:5432/postgres?sslmode=require` |
| `JWT_SECRET` | `55754cfc5162971fb561bd7c34a890f9197d987b11409b9cd2ab7fc74be3f767` |
| `JWT_REFRESH_SECRET` | `d76ee08725b04ba34b2934ca91905541cd0d0e6f8aeb86b499e3f3fb6fb7dd4c` |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `OAUTH_GOOGLE_REDIRECT_URI` | `https://quorvexa-api-gateway.vercel.app/api/v1/auth/google/callback` |
| `CORS_ORIGINS` | `https://quorvexa-taupe.vercel.app,https://quorvexa-api-gateway.vercel.app,https://quorvexa-auth-service.vercel.app,https://quorvexa-user-service.vercel.app,https://quorvexa-workflow-service.vercel.app,https://quorvexa-notification-service.vercel.app` |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX` | `100` |
| `LOG_LEVEL` | `info` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `https://otlp-gateway-prod-ap-southeast-2.grafana.net:443` |
| `OTEL_EXPORTER_OTLP_HEADERS` | `Authorization=Basic MzIyNDU5MjpnbGNfZXlKdklqb2lPVGN4TkRVeElpd2liaUk2SW5OMFlXTnJMVEUyTlRBeE9EUXRhRzB0ZDNKcGRHVXRjSEp2YldWMGFHVjFjeTFuY21GbVlXNWhZMnh2ZFdRdGNIbHliMkpzWVhwbGNpSXNJbXNpT2lKMVZXTnhORGRXUnpWaGJ6RTNOak0wUlVGVFNrMXpNREVpTENKdElqcDdJbklpT2lKd2NtOWtMV0Z3TFhOdmRYUm9aV0Z6ZEMweUluMTk=` |

> **Note:** `OAUTH_GOOGLE_CLIENT_ID` and `OAUTH_GOOGLE_CLIENT_SECRET` can be left empty and added later when you set up Google OAuth.

---

### Service 3: User Service

| Setting | Value |
|---------|-------|
| **Project Name** | `quorvexa-user-service` |
| **Framework Preset** | Other |
| **Root Directory** | `services/user-service` |

**Environment Variables:**

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://postgres:<password>@<host>.supabase.co:5432/postgres?sslmode=require` |
| `JWT_SECRET` | `55754cfc5162971fb561bd7c34a890f9197d987b11409b9cd2ab7fc74be3f767` |
| `CORS_ORIGINS` | `https://quorvexa-taupe.vercel.app,https://quorvexa-api-gateway.vercel.app,https://quorvexa-auth-service.vercel.app,https://quorvexa-user-service.vercel.app,https://quorvexa-workflow-service.vercel.app,https://quorvexa-notification-service.vercel.app` |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX` | `100` |
| `LOG_LEVEL` | `info` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `https://otlp-gateway-prod-ap-southeast-2.grafana.net:443` |
| `OTEL_EXPORTER_OTLP_HEADERS` | `Authorization=Basic MzIyNDU5MjpnbGNfZXlKdklqb2lPVGN4TkRVeElpd2liaUk2SW5OMFlXTnJMVEUyTlRBeE9EUXRhRzB0ZDNKcGRHVXRjSEp2YldWMGFHVjFjeTFuY21GbVlXNWhZMnh2ZFdRdGNIbHliMkpzWVhwbGNpSXNJbXNpT2lKMVZXTnhORGRXUnpWaGJ6RTNOak0wUlVGVFNrMXpNREVpTENKdElqcDdJbklpT2lKd2NtOWtMV0Z3TFhOdmRYUm9aV0Z6ZEMweUluMTk=` |

---

### Service 4: Workflow Service

| Setting | Value |
|---------|-------|
| **Project Name** | `quorvexa-workflow-service` |
| **Framework Preset** | Other |
| **Root Directory** | `services/workflow-service` |

**Environment Variables:**

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://postgres:<password>@<host>.supabase.co:5432/postgres?sslmode=require` |
| `JWT_SECRET` | `55754cfc5162971fb561bd7c34a890f9197d987b11409b9cd2ab7fc74be3f767` |
| `AI_AGENT_SERVICE_URL` | `https://quorvexa-agentic-ai-workflow-saas.onrender.com` |
| `NOTIFICATION_SERVICE_URL` | `https://quorvexa-notification-service.vercel.app` |
| `KAFKA_BROKER` | `localhost:9092` |
| `CORS_ORIGINS` | `https://quorvexa-taupe.vercel.app,https://quorvexa-api-gateway.vercel.app,https://quorvexa-auth-service.vercel.app,https://quorvexa-user-service.vercel.app,https://quorvexa-workflow-service.vercel.app,https://quorvexa-notification-service.vercel.app` |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX` | `100` |
| `LOG_LEVEL` | `info` |

---

### Service 5: Notification Service

| Setting | Value |
|---------|-------|
| **Project Name** | `quorvexa-notification-service` |
| **Framework Preset** | Other |
| **Root Directory** | `services/notification-service` |

**Environment Variables:**

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://postgres:<password>@<host>.supabase.co:5432/postgres?sslmode=require` |
| `JWT_SECRET` | `55754cfc5162971fb561bd7c34a890f9197d987b11409b9cd2ab7fc74be3f767` |
| `CORS_ORIGINS` | `https://quorvexa-taupe.vercel.app,https://quorvexa-api-gateway.vercel.app,https://quorvexa-auth-service.vercel.app,https://quorvexa-user-service.vercel.app,https://quorvexa-workflow-service.vercel.app,https://quorvexa-notification-service.vercel.app` |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX` | `100` |
| `LOG_LEVEL` | `info` |
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `resend` |
| `SMTP_PASS` | `re_V2kFjsaJ_B7hFKsHqivWzK5VgCeQ9Wezj` |
| `EMAIL_FROM` | `Quorvexa <onboarding@resend.dev>` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `https://otlp-gateway-prod-ap-southeast-2.grafana.net:443` |
| `OTEL_EXPORTER_OTLP_HEADERS` | `Authorization=Basic MzIyNDU5MjpnbGNfZXlKdklqb2lPVGN4TkRVeElpd2liaUk2SW5OMFlXTnJMVEUyTlRBeE9EUXRhRzB0ZDNKcGRHVXRjSEp2YldWMGFHVjFjeTFuY21GbVlXNWhZMnh2ZFdRdGNIbHliMkpzWVhwbGNpSXNJbXNpT2lKMVZXTnhORGRXUnpWaGJ6RTNOak0wUlVGVFNrMXpNREVpTENKdElqcDdJbklpT2lKd2NtOWtMV0Z3TFhOdmRYUm9aV0Z6ZEMweUluMTk=` |

---

## Step 3: Deploy AI Agent Service to Render

The AI Agent is a Python FastAPI app — Vercel doesn't support it, so it runs on Render.

1. Go to **[Render Dashboard](https://dashboard.render.com)**
2. Click **New** → **Web Service**
3. Connect your GitHub repo: `pyroblazer/quorvexa-agentic-ai-workflow-saas-platform`
4. Configure:
   - **Name:** `quorvexa-agentic-ai-workflow-saas`
   - **Root Directory:** `services/ai-agent-service`
   - **Runtime:** Python 3
   - **Build Command:** `pip install poetry && poetry install --no-dev`
   - **Start Command:** `poetry run uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Environment Variables for Render:**

| Key | Value |
|-----|-------|
| `ENVIRONMENT` | `production` |
| `LLM_PROVIDER` | `groq` |
| `OPENAI_BASE_URL` | `https://api.groq.com/openai/v1` |
| `LLM_MODEL` | `llama-3.3-70b-versatile` |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` |
| `GROQ_API_KEY` | `<your-groq-api-key>` |
| `VECTOR_DB_PROVIDER` | `supabase` |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `<your-supabase-service-role-key>` |
| `VECTOR_DB_COLLECTION` | `quorvexa_embeddings` |
| `REDIS_URL` | `rediss://default:<password>@<host>.upstash.io:6379` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `https://otlp-gateway-prod-ap-southeast-2.grafana.net:443` |
| `OTEL_EXPORTER_OTLP_HEADERS` | `Authorization=Basic MzIyNDU5MjpnbGNfZXlKdklqb2lPVGN4TkRVeElpd2liaUk2SW5OMFlXTnJMVEUyTlRBeE9EUXRhRzB0ZDNKcGRHVXRjSEp2YldWMGFHVjFjeTFuY21GbVlXNWhZMnh2ZFdRdGNIbHliMkpzWVhwbGNpSXNJbXNpT2lKMVZXTnhORGRXUnpWaGJ6RTNOak0wUlVGVFNrMXpNREVpTENKdElqcDdJbklpT2lKd2NtOWtMV0Z3TFhOdmRYUm9aV0Z6ZEMweUluMTk=` |
| `JWT_SECRET` | `55754cfc5162971fb561bd7c34a890f9197d987b11409b9cd2ab7fc74be3f767` |
| `CORS_ORIGINS` | `https://quorvexa-taupe.vercel.app,https://quorvexa-api-gateway.vercel.app` |

---

## Step 4: Update the Web App

The Next.js web app is already deployed at `https://quorvexa-taupe.vercel.app`.

1. Go to **Vercel Dashboard** → `quorvexa` project → **Settings** → **Environment Variables**
2. Add or update:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://quorvexa-api-gateway.vercel.app` |

3. Go to **Deployments** → click the **...** menu on the latest deployment → **Redeploy**

---

## Step 5: Verify Everything

Run these commands to check each service is healthy:

```bash
# Web app
curl -s -o /dev/null -w "%{http_code}" https://quorvexa-taupe.vercel.app

# API Gateway
curl https://quorvexa-api-gateway.vercel.app/api/v1/health/live

# Auth Service
curl https://quorvexa-auth-service.vercel.app/api/v1/health/live

# User Service
curl https://quorvexa-user-service.vercel.app/api/v1/health/live

# Workflow Service
curl https://quorvexa-workflow-service.vercel.app/api/v1/health/live

# Notification Service
curl https://quorvexa-notification-service.vercel.app/api/v1/health/live

# AI Agent Service
curl https://quorvexa-agentic-ai-workflow-saas.onrender.com/api/v1/health/live
```

### Full Login Test

```bash
# Register a user via the gateway
curl -X POST https://quorvexa-api-gateway.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","firstName":"Test","lastName":"User"}'

# Login
curl -X POST https://quorvexa-api-gateway.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

### Check Observability

1. Go to **[Grafana Cloud](https://pyroblazerv2.grafana.net)**
2. Navigate to **Explore** → query traces from your services
3. You should see trace data from the gateway and backend services

---

## SaaS Provider Credentials Reference

| Provider | Purpose | Dashboard |
|----------|---------|-----------|
| **Supabase** | Postgres + pgvector | [supabase.com/dashboard](https://supabase.com/dashboard) |
| **Upstash** | Redis | [console.upstash.com](https://console.upstash.com) |
| **Groq** | LLM inference | [console.groq.com](https://console.groq.com) |
| **CloudAMQP** | RabbitMQ | [cloudamqp.com](https://customer.cloudamqp.com) |
| **Resend** | Email delivery | [resend.com](https://resend.com) |
| **Grafana Cloud** | Traces & metrics | [pyroblazerv2.grafana.net](https://pyroblazerv2.grafana.net) |
| **Render** | AI Agent (Python) | [dashboard.render.com](https://dashboard.render.com) |

---

## Troubleshooting

### Build fails with `npm install` error

Make sure you did NOT override the Build/Install commands in Vercel Dashboard. The `vercel.json` in each service directory handles this with `corepack enable && pnpm install`.

### `ECONNREFUSED` or `502 Bad Gateway`

- Check the `*_SERVICE_URL` env vars in the gateway point to the correct Vercel URLs
- Ensure the target service is deployed and healthy (check its health endpoint)
- Vercel serverless functions have cold starts — the first request may take a few seconds

### Database connection fails

- Ensure `DATABASE_URL` uses the Supabase **direct connection** (`db.<project-ref>.supabase.co:5432`), not the pooler
- The `?sslmode=require` parameter must be present

### CORS errors in browser

- Ensure `CORS_ORIGINS` in each service includes ALL other service URLs plus the web app URL
- After adding a new service, update `CORS_ORIGINS` in ALL other services and redeploy
