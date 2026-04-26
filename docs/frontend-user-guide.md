# Frontend User Guide

This guide explains every screen, button, and navigation path in the Quorvexa platform.

---

## Navigation Structure

```
/ (Homepage)
├── /auth/login          ← Sign in screen
├── /auth/register       ← Create account screen
└── /dashboard           ← Main workspace (requires login)
    ├── /workflows        ← All workflows list
    │   ├── /workflows/new       ← Create a new workflow
    │   └── /workflows/:id       ← Workflow detail/editor
    ├── /agents           ← AI Agent chat interface
    └── /settings         ← Account & workspace settings
```

---

## Screen-by-Screen Guide

### 1. Homepage (`/`)

The landing page introduces the platform.

**What you see:**
- Platform name and description
- "Get Started" button → goes to `/dashboard` (redirects to login if not authenticated)
- "Sign In" button → goes to `/auth/login`
- Three feature cards explaining key capabilities

**What to do next:** Click "Sign In" if you have an account, or "Get Started" to register.

---

### 2. Login Screen (`/auth/login`)

**Step-by-step:**
1. Type your email address in the "Email address" field
2. Type your password in the "Password" field
3. Click the "Sign in" button
4. If credentials are correct → you go to `/dashboard`
5. If incorrect → a red error message appears at the top

**Accessibility notes:**
- Tab key navigates between fields
- Error messages are announced by screen readers via `role="alert"`
- All form fields have visible labels

**Forgot password?** (Coming in v1.1) — contact your admin to reset.

---

### 3. Register Screen (`/auth/register`)

**Requirements for password:**
- At least 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@, $, !, %, *, ?, &)

Example: `MyPass@2024`

---

### 4. Dashboard (`/dashboard`)

**Overview cards (top row):**
- **Total Workflows**: number of workflows in your workspace
- **Active**: workflows that are enabled and can be triggered
- **Runs Today**: how many times workflows were executed today

**Recent Workflows table:**
- Shows last 20 workflows by last-updated date
- Click a workflow name → opens the workflow editor
- "Never run" means the workflow has been created but not triggered yet

**"New Workflow" button** (top-right): opens the workflow creation form.

---

### 5. Workflow Editor (`/workflows/:id`)

**Workflow settings:**
- **Name**: human-readable name for the workflow
- **Description**: optional explanation of what the workflow does
- **Trigger type**: how the workflow starts
  - `manual` → only runs when you click "Trigger"
  - `scheduled` → runs on a CRON schedule (e.g., every Monday at 9am: `0 9 * * 1`)
  - `webhook` → runs when an external system sends an HTTP request
  - `event` → runs when a Kafka event is received

**Steps panel:**
Each step is executed in order. Step types:

| Type | What it does |
|------|-------------|
| `action` | Runs a built-in business action |
| `condition` | Checks a value and branches the flow |
| `ai_agent` | Calls an AI agent with a prompt |
| `http_request` | Makes an HTTP call to an external API |
| `notification` | Sends an email, Slack, or webhook notification |
| `delay` | Pauses execution for N milliseconds |
| `transform` | Maps data from one format to another |

**Activating a workflow:**
1. Create your steps
2. Click "Activate" button in the top-right
3. Status changes from `draft` → `active`
4. The workflow can now be triggered

**Triggering manually:**
1. Click "Trigger" button
2. Optionally add a JSON payload (passed to the first step)
3. Click "Run"
4. The step panel shows real-time status via SSE (green = success, red = failed)

---

### 6. AI Agent Chat (`/agents`)

1. Type your request in the input box at the bottom
2. Press Enter or click "Send"
3. The AI agent processes your request using the configured LLM
4. If the agent uses tools (web search, HTTP, etc.), you'll see the tool calls listed
5. Your conversation history is retained in the current session

**Available tools the agent can use:**
- Web search
- HTTP requests to external APIs
- Database queries
- Code execution (sandboxed)
- Text summarization

---

## Real-time Updates

Workflow execution progress is streamed live using Server-Sent Events. You don't need to refresh the page. When a workflow runs:

1. Each step shows a "running" spinner
2. On completion: green checkmark with duration
3. On failure: red X with error message
4. You can expand any step to see its full output

---

## Accessibility Features

- All interactive elements are keyboard navigable (Tab to cycle, Enter to activate)
- Color contrast meets WCAG AA standard (4.5:1 minimum)
- Screen reader support: all icons have aria-labels, dynamic content uses aria-live regions
- Reduced motion: animations respect `prefers-reduced-motion` system setting
- Focus ring: always visible, high-contrast blue ring on focused elements
