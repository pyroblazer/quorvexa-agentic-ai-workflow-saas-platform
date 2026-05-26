# Quorvexa Workflow Testing Guide

Complete guide to seed test data and execute all 10 workflow test scenarios.

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start all services (in separate terminals)
# Terminal 1
cd services/auth-service && pnpm start

# Terminal 2
cd services/user-service && pnpm start

# Terminal 3
cd services/workflow-service && pnpm start

# Terminal 4
cd services/notification-service && pnpm start

# Terminal 5
cd services/ai-agent-service && pnpm start

# Terminal 6
cd apps/gateway && pnpm start

# 3. Run seeds (once, before any tests)
node services/auth-service/src/database/seeds/seed-admin.js
node services/auth-service/src/database/seeds/seed-demo.js

# 4. Run test scenarios
bash tests/workflow-scenarios.sh
```

## Seeded Data

### Test Users
- `demo@quorvexa.dev` (role: admin) — comprehensive demo account with profiles, preferences, templates, workflows
- `test1@quorvexa.dev` (role: member) — basic test user
- `test2@quorvexa.dev` (role: viewer) — viewer-role user
- `test-gmail@quorvexa.dev` (role: admin) — for email delivery tests
- `locked@quorvexa.dev` (role: admin, locked) — account locked for 1 hour (lockout test)

All test users have password: `Test@1234!`

### Seeded Workflows

**Reference Workflows (18 total):**
1. Customer Onboarding Automation
2. CI/CD Deployment Pipeline
3. Incident Response Automation
4. API Health Monitor
5. Data ETL Pipeline
6. AI Content Generator
7. E-Commerce Order Processing
8. Employee Onboarding
9. Social Media Scheduler
10. Security Audit Scanner
11. Invoice Processing (archived)
12. Lead Scoring & Routing
13. Multi-Channel Marketing
14. Database Backup Verification
15. Document Review Pipeline
16. Simple Self-Test
17. AI Agent Demo
18. Notification Demo

**Test Scenario Workflows (10 total):**
- `[TEST] Direct AI Agent` — Scenario 1: Simple agent call
- `[TEST] Email Report Generation` — Scenario 2: AI + email
- `[TEST] Fetch Data & Summarize` — Scenario 3: HTTP + AI + email
- `[TEST] Sentiment Classification Branch` — Scenario 4: Condition branching
- `[TEST] RAG Pipeline Setup` — Scenario 5: Vector DB operations
- `[TEST] Notification Template` — Scenario 6: Template rendering
- `[TEST] Webhook Delivery` — Scenario 7: Webhook channel
- `[TEST] Retry & Failure Handling` — Scenario 8: Error resilience
- `[TEST] SSE Stream Events` — Scenario 9: Event streaming
- `[TEST] Full Agentic Pipeline` — Scenario 10: All step types

### Notification Templates (5 total)
1. Workflow Completed (in_app)
2. Workflow Failed (in_app)
3. Agent Task Complete (in_app)
4. Weekly Digest (email)
5. Deployment Alert (webhook)

---

## Test Scenarios

### Scenario 1 — Direct AI Agent (Smoke Test)

**What it tests:** Groq LLM responds, session memory works.

```bash
curl -X POST http://localhost:4000/api/v1/agents/tools

curl -X POST http://localhost:4000/api/v1/agents/run \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is 2+2?",
    "session_id": "test-session-001"
  }'
```

**Expected:** `output` field with AI response.

---

### Scenario 2 — Email + AI

**What it tests:** AI generates report, Resend sends real email.

```bash
# Trigger workflow
curl -X POST http://localhost:4000/api/v1/workflows/<wf-id>/trigger \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "ignatiustimothymanullang@gmail.com"}'
```

**Expected:** 
- step_0.output contains AI-generated text
- Email arrives at Gmail from `onboarding@resend.dev`

---

### Scenario 3 — HTTP → AI → Email

**What it tests:** Workflow chains HTTP response → AI processing → email.

```bash
curl -X POST http://localhost:4000/api/v1/workflows/<wf-id>/trigger \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "ignatiustimothymanullang@gmail.com"}'
```

**Expected:**
- step_0: JSON from JSONPlaceholder
- step_1: AI summary of the JSON
- Email with summary arrives

---

### Scenario 4 — Conditional Branch

**What it tests:** AI output triggers condition, branches workflow.

```bash
curl -X POST http://localhost:4000/api/v1/workflows/<wf-id>/trigger \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "ignatiustimothymanullang@gmail.com"}'
```

**Expected:**
- step_1.output.branch = "true" (condition matched)
- step_2 (email) status = "completed"

---

### Scenario 5 — RAG Pipeline

**What it tests:** Embed → search → grounded AI response.

```bash
# Embed
curl -X POST http://localhost:4000/api/v1/agents/embed \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Quorvexa is an enterprise AI workflow automation platform.",
    "metadata": {"source": "faq"}
  }'

# Search
curl -X POST http://localhost:4000/api/v1/agents/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What is Quorvexa?", "limit": 3}'

# Grounded response
curl -X POST http://localhost:4000/api/v1/agents/run \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Describe Quorvexa based on company knowledge.",
    "session_id": "rag-test",
    "context": {"knowledge": "Quorvexa is..."}
  }'
```

**Expected:** Search returns similarity > 0.8, AI mentions specific facts.

---

### Scenario 6 — Notification Template

**What it tests:** Template creation, preview, email delivery.

```bash
# Create
curl -X POST http://localhost:4000/api/v1/notifications/templates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Template",
    "slug": "test-'"$(date +%s)"'",
    "subject": "{{title}}",
    "bodyTemplate": "Content: {{body}}",
    "channel": "email"
  }'

# Render preview
curl -X POST http://localhost:4000/api/v1/notifications/templates/<id>/render \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Test", "body": "Content..."}'

# Send
curl -X POST http://localhost:4000/api/v1/notifications/send \
  -H "Authorization: Bearer <token>" \
  -d '{
    "userId": "<user-id>",
    "channel": "email",
    "recipient": "ignatiustimothymanullang@gmail.com",
    "templateId": "<id>",
    "metadata": {"title": "Test", "body": "Content..."}
  }'
```

**Expected:** Rendered preview shows interpolated values, email arrives.

---

### Scenario 7 — Webhook Notification

**What it tests:** Notification service POSTs to external webhook.

```bash
# Get a free webhook URL from https://webhook.site

curl -X POST http://localhost:4000/api/v1/notifications/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<user-id>",
    "channel": "webhook",
    "recipient": "https://webhook.site/unique-id",
    "subject": "Test",
    "body": "Webhook test"
  }'
```

**Expected:** webhook.site shows incoming POST with body.

---

### Scenario 8 — Retry & Failure

**What it tests:** Failed delivery attempts retry.

```bash
curl -X POST http://localhost:4000/api/v1/notifications/send \
  -H "Authorization: Bearer <token>" \
  -d '{
    "userId": "<user-id>",
    "channel": "email",
    "recipient": "invalid-email",
    "subject": "Test",
    "body": "This will fail",
    "maxRetries": 2
  }'

# Check status
curl http://localhost:4000/api/v1/notifications/<id> \
  -H "Authorization: Bearer <token>"
```

**Expected:** status = "failed", errorMessage present, retryCount tracked.

---

### Scenario 9 — SSE Stream

**What it tests:** Real-time workflow execution events.

```bash
# Terminal A: Open stream
curl -N -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/v1/workflows/<wf-id>/events

# Terminal B: Trigger
curl -X POST http://localhost:4000/api/v1/workflows/<wf-id>/trigger \
  -H "Authorization: Bearer <token>"
```

**Expected:** Terminal A receives heartbeat events every 2s.

---

### Scenario 10 — Full Agentic Pipeline

**What it tests:** All step types in one workflow.

```bash
curl -X POST http://localhost:4000/api/v1/workflows/<wf-id>/trigger \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "ignatiustimothymanullang@gmail.com"}'

# Wait ~15s for execution
sleep 15

# Check result
curl http://localhost:4000/api/v1/workflows/<wf-id> \
  -H "Authorization: Bearer <token>"
```

**Expected:** All 6 steps completed, email with GitHub insights received.

---

## Auth Edge Cases

### Account Lockout

```bash
# Try 5 bad logins
for i in {1..5}; do
  curl -X POST http://localhost:4000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@quorvexa.dev", "password": "wrong"}'
done

# 6th attempt should fail
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@quorvexa.dev", "password": "Test@1234!"}'
```

**Expected:** 403 with "Account locked" message.

### Token Refresh

```bash
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  -H "Authorization: Bearer <refresh-token>"
```

**Expected:** New accessToken + new refreshToken.

### Token Reuse Prevention

```bash
# Use the OLD refreshToken again (should fail)
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  -H "Authorization: Bearer <old-refreshToken>"
```

**Expected:** 401 Unauthorized.

---

## Verification Checklist

| Test | How to Verify |
|---|---|
| AI responds | `output` in response JSON |
| Email sent | Check Gmail inbox (from `onboarding@resend.dev`) |
| Workflow chains | `steps[N].output` contains prior step data |
| Condition branches | `branch: "true"` in condition step |
| RAG retrieval | similarity score > 0.8 |
| Template interpolation | Rendered preview shows {{variable}} → value |
| Webhook delivered | webhook.site shows POST |
| Retry tracked | `retryCount` increments, `status` updates |
| SSE working | `curl -N` shows continuous heartbeats |
| Auth lockout | 5th failed login → account locked |

---

## Running Tests Programmatically

```bash
# Run all tests with the provided script
bash tests/workflow-scenarios.sh

# Or run specific scenarios:
BASE=http://localhost:4000 TOKEN=<your-token> bash tests/workflow-scenarios.sh
```

---

## Troubleshooting

### Services not starting
- Ensure PostgreSQL is running: `psql -U quorvexa -d quorvexa_db -c "SELECT 1"`
- Check .env files for correct `DATABASE_URL`
- Run migrations: `cd services/auth-service && pnpm run migrate`

### Seed data not loaded
- Check logs: `node services/auth-service/src/database/seeds/seed-demo.js`
- Ensure database has proper tables (run migrations first)
- Idempotent seed: safe to run multiple times

### Workflows not found
- Verify seed ran: Check database `select count(*) from workflows`
- Check tenant ID matches in .env (`DEFAULT_TENANT_ID=default`)

### Emails not arriving
- Verify Resend API key in .env: `RESEND_API_KEY=re_...`
- Check SMTP config: `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`
- Resend requires verified sender domain (uses `onboarding@resend.dev` by default)

### AI agent timeouts
- Ensure LLM is configured: `LLM_PROVIDER=groq` (cloud) or `local` (Ollama required)
- Check Groq API key: `GROQ_API_KEY=gsk_...` in .env.production
- For local Ollama: ensure service at `http://localhost:11434`

---

## Appendix: Environment Variables

Key variables needed for full testing:

```env
# Database
DATABASE_URL=postgresql://quorvexa:quorvexa_dev_pass@localhost:5432/quorvexa_db

# Email (Resend)
RESEND_API_KEY=re_...
SMTP_HOST=smtp.resend.com
SMTP_PORT=465

# LLM
LLM_PROVIDER=groq (or local for Ollama)
GROQ_API_KEY=gsk_... (if using Groq)

# Vector DB
VECTOR_DB_URL=http://localhost:6333 (Qdrant)
VECTOR_DB_PROVIDER=qdrant

# Services
AUTH_SERVICE_URL=http://localhost:3001
WORKFLOW_SERVICE_URL=http://localhost:3003
NOTIFICATION_SERVICE_URL=http://localhost:3004
AI_AGENT_SERVICE_URL=http://localhost:3005
GATEWAY_PORT=4000
```
