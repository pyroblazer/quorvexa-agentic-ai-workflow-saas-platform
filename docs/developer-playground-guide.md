# Quorvexa Developer Playground Guide

The Developer Playground is an interactive sandbox built into the Quorvexa platform. It lets you create, test, and simulate every object in the system — auth flows, workflows, notifications, AI agents, and user preferences — without touching production data.

---

## Quick Start

### 1. Start the Platform

```bash
# Make sure Docker Desktop is running, then:
pnpm dev
```

This starts all infrastructure (Postgres, Redis, Qdrant, Kafka) and all services (gateway, auth, user, workflow, notification, AI agent) in watch mode.

### 2. Seed the Database

```bash
pnpm seed
```

This creates two accounts:
- **Super Admin** — `admin@quorvexa.dev` / `Qu0rv3xa!Admin`
- **Demo Admin** — `demo@quorvexa.dev` / `D3m0!Quorvexa` (with full example data)

### 3. Log In

1. Open **http://localhost:3000/auth/login** in your browser
2. Enter the credentials for either account (see table below)
3. Click **Sign In** — you'll be redirected to the dashboard

The login form is pre-filled with the admin credentials. Switch to the demo account to explore pre-populated data.

### 4. Open the Playground

- In the **left sidebar**, click **Dev Playground**
- Or navigate directly to **http://localhost:3000/dashboard/dev**

> **Note:** The playground is only visible when `NEXT_PUBLIC_ENABLE_DEV_TOOLS=true` (set in `apps/web/.env.development`). It is hidden in production builds.

---

## Accounts

### Admin Account

The platform super admin. Use this for full system access.

| Field     | Value                |
|-----------|----------------------|
| Email     | `admin@quorvexa.dev` |
| Password  | `Qu0rv3xa!Admin`     |
| Role      | `super_admin`        |
| Tenant    | `default`            |

### Demo Account (recommended for exploring)

A fully-loaded demo account with pre-populated workflows, notifications, templates, preferences, and audit history. This is the best starting point for exploring the platform.

| Field     | Value                |
|-----------|----------------------|
| Email     | `demo@quorvexa.dev`  |
| Password  | `D3m0!Quorvexa`      |
| Role      | `admin`              |
| Tenant    | `default`            |

**Pre-seeded data for this account:**
- User profile (Timothy Man, Senior Platform Engineer, AI & Automation)
- Preferences (dark theme, `en-US`, `America/New_York`, all notification channels enabled)
- 3 complex workflows with detailed step configurations (see below)
- 5 notification templates (workflow events, agent tasks, weekly digest, deployment alerts)
- 6 notifications (mix of read/delivered/pending states)
- 4 audit log entries (login history, failed attempt, password change)

### Test User Account

For testing registration and member-level access.

| Field      | Value               |
|------------|----------------------|
| Email      | `dev@quorvexa.io`    |
| Password   | `DevPass123!`        |
| First Name | `Dev`                |
| Last Name  | `User`               |

### Simulation Guide Account

Used by the automated simulation guide (step 6 in the playground).

| Field      | Value                 |
|------------|------------------------|
| Email      | `dev-test@quorvexa.io` |
| Password   | `DevPass123!`          |
| First Name | `Test`                 |
| Last Name  | `User`                 |

> **Tip:** Passwords require min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, and 1 special character (`@$!%*?&`).

---

## Walkthrough: Using the Demo Account

Log in as `demo@quorvexa.dev` and follow these steps to explore every feature.

### Step 1: View Your Profile

1. Open the playground
2. In the **Auth & Users** tab, scroll to **User Profile**
3. Click **Get Profile** — you'll see Timothy Man's profile with title, department, bio, and social links

### Step 2: Explore Workflows

Switch to the **Workflows** tab and click **List All**. You'll see 3 pre-built workflows:

#### Workflow 1: Customer Onboarding Automation (Active)

A complex 8-step scheduled workflow that runs every weekday at 9 AM:

| Step | Name | Type | What It Does |
|------|------|------|-------------|
| 1 | Validate Customer Data | `condition` | Checks email format and required fields |
| 2 | Create Customer Account | `http_request` | POST to user service API |
| 3 | Send Welcome Email | `notification` | Uses email template |
| 4 | Provision Resources | `http_request` | Allocates starter plan resources |
| 5 | AI Onboarding Assistant | `ai_agent` | Generates personalized guide via LLM |
| 6 | Transform Customer Summary | `transform` | Maps outputs into unified summary |
| 7 | Notify Sales Team | `notification` | Sends Slack alert to #sales-onboarding |
| 8 | Wait for Verification | `delay` | 5s propagation delay |

All 8 steps show `completed` status with realistic output data. Try clicking **Trigger Run** to execute it again.

#### Workflow 2: CI/CD Pipeline (Draft)

A 6-step webhook-triggered pipeline:

| Step | Name | Type |
|------|------|------|
| 1 | Lint & Format Check | `http_request` |
| 2 | Run Unit Tests | `action` |
| 3 | AI Code Review | `ai_agent` |
| 4 | Build Docker Image | `http_request` |
| 5 | Deploy to Staging | `http_request` |
| 6 | Notify Team | `notification` |

All steps are in `pending` status (draft workflow has never run). Click **Activate** then **Trigger Run** to execute it.

#### Workflow 3: Incident Response (Paused)

A 4-step event-driven workflow for automated incident triage:

| Step | Name | Type |
|------|------|------|
| 1 | Detect Anomaly | `condition` |
| 2 | AI Diagnosis | `ai_agent` |
| 3 | Create Incident Ticket | `http_request` |
| 4 | Page On-Call Engineer | `notification` |

Steps show `completed` from the last run (3 days ago). Resume it by clicking **Activate**.

### Step 3: Explore Notifications

Switch to the **Notifications** tab and click **List Mine**. You'll see 6 notifications:

| Status | Channel | Subject |
|--------|---------|---------|
| `read` | in_app | Welcome to Quorvexa! |
| `read` | in_app | Workflow "Daily Report Pipeline" completed |
| `read` | in_app | AI Agent finished: Code review summary |
| `delivered` | in_app | New workflow template available |
| `delivered` | email | Your Quorvexa Weekly Digest |
| `pending` | in_app | Workflow "Customer Onboarding" needs attention |

Try clicking **Mark Read** on the pending notification, or **Retry Failed** on a delivered one.

### Step 4: Run an AI Agent

Switch to the **AI Agents** tab:

1. **Run an agent**: Enter a prompt like "Explain the Customer Onboarding workflow in 3 bullet points" and click **Run Agent**
   - Requires Ollama running with a pulled model (`ollama pull llama3`)
   - The agent can use tools: `search_web`, `execute_code`, `query_database`, `send_http_request`, `summarize_text`

2. **Embed content**: Paste text and click **Embed** to store it in the Qdrant vector database

3. **Search memory**: Query the vector store with "What is Quorvexa?" to retrieve embedded content

4. **List Tools**: Click this to see all 5 available agent tools

### Step 5: Check Preferences

Switch to the **Preferences** tab and click **Get Preferences**. You'll see:

| Setting | Value |
|---------|-------|
| Theme | `dark` |
| Locale | `en-US` |
| Timezone | `America/New_York` |
| Date Format | `YYYY-MM-DD` |
| Email Notifications | `true` |
| Notifications | email, in_app, slack enabled; sms disabled |
| Dashboard Widgets | recent_workflows, agent_activity, notifications, quick_actions |

Try changing the theme to `light` or the timezone to `Europe/London` and clicking **Update**.

### Step 6: Run the Simulation Guide

Switch to the **Simulation Guide** tab. This walks through 8 steps that exercise every feature:

| Step | Action | What Happens |
|------|--------|-------------|
| 1 | Register a test user | Creates `dev-test@quorvexa.io` |
| 2 | Login as test user | Authenticates and stores session |
| 3 | View your profile | Fetches user profile |
| 4 | Create a workflow | Creates "Demo Workflow" with manual trigger |
| 5 | Activate the workflow | Enables it for execution |
| 6 | Trigger the workflow | Runs it immediately |
| 7 | Send a notification | Sends an in-app notification |
| 8 | Run an AI agent | Sends a prompt to the agent service |

Click **Execute** on each step in sequence. The progress badge shows `X/8`. Use **Reset** to start over.

---

## Tab Reference

### Auth & Users

**Login Form**

| Field    | Pre-filled Value       |
|----------|------------------------|
| Email    | `admin@quorvexa.dev`   |
| Password | `Qu0rv3xa!Admin`       |

Quick actions:
- **Quick Login (Admin)** — one-click login
- **Refresh Token** — refresh session token
- **Generate Test User** — creates random user (e.g. `test-a3f2k1@quorvexa.io` / `TestPass123!`)
- **Logout All Sessions** — invalidates all sessions

**Register Form**

| Field      | Pre-filled Value    |
|------------|----------------------|
| Email      | `dev@quorvexa.io`    |
| Password   | `DevPass123!`        |
| First Name | `Dev`                |
| Last Name  | `User`               |

**User Profile Form**

| Field      | Pre-filled Value              |
|------------|-------------------------------|
| First Name | `Dev`                         |
| Last Name  | `User`                        |
| Title      | `Engineer`                    |
| Department | `Engineering`                 |
| Phone      | _(empty)_                     |

### Workflows

| Field        | Pre-filled Value          |
|--------------|---------------------------|
| Name         | `Test Workflow`           |
| Description  | `Created from playground` |
| Trigger Type | `manual`                  |

Quick actions:
- **Generate Sample Workflow** — creates workflow with random trigger type
- **List All** / **Get Details** / **Activate** / **Trigger Run** / **Delete**

### Notifications

| Field     | Pre-filled Value              |
|-----------|-------------------------------|
| Channel   | `in_app`                      |
| Subject   | `Test Notification`           |
| Body      | `Hello from the playground!`  |
| Recipient | _(empty = self)_              |

Quick actions:
- **Generate Sample Notification** — random channel and content
- **List All** / **List Mine** / **Mark Read** / **Retry Failed** / **Delete**

### AI Agents

**Run Agent**

| Field      | Pre-filled Value                                    |
|------------|-----------------------------------------------------|
| Prompt     | `Summarize the following text in 3 bullet points`   |
| Session ID | _(empty = new session)_                              |

**Embed Content**

| Field   | Pre-filled Value                                    |
|---------|-----------------------------------------------------|
| Content | `Quorvexa is an agentic AI workflow SaaS platform.` |

**Search Memory**

| Field | Pre-filled Value       |
|-------|------------------------|
| Query | `What is Quorvexa?`   |

### Preferences

| Field       | Pre-filled Value      |
|-------------|-----------------------|
| Theme       | `dark`                |
| Locale      | `en-US`               |
| Timezone    | `America/New_York`    |
| Date Format | `YYYY-MM-DD`          |

Quick actions:
- **Get Preferences** / **Reset to Defaults**

---

## Architecture Overview

Request flow for all API calls:

```
Browser (localhost:3000)
  -> Next.js rewrite (/api/* -> localhost:4000/api/*)
  -> API Gateway (port 4000)
     -> Proxy middleware routes by path prefix:
        /api/v1/auth/*         -> Auth Service    (port 3001)
        /api/v1/users/*        -> User Service    (port 3002)
        /api/v1/workflows/*    -> Workflow Service (port 3003)
        /api/v1/notifications/* -> Notification Service (port 3004)
        /api/v1/agents/*       -> AI Agent Service (port 3005)
```

All backend services share a single PostgreSQL database (`quorvexa_db` on port 5432) in development.

---

## Tips

- Every form field is pre-filled with sensible defaults — submit immediately
- **Clear Responses** at the top resets all API response panels
- API responses appear below each section in a JSON viewer
- **Generate Sample** buttons create randomized data
- All playground data is sandboxed — it does not affect production
- Use `demo@quorvexa.dev` to see rich pre-populated data across all tabs
- For AI Agent features, ensure Ollama is running: `ollama serve && ollama pull llama3`
