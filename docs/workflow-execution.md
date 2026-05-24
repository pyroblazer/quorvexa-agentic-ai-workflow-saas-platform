# Workflow Execution: Incident Response

## How to Execute

**Prerequisites:** All services running (gateway, workflow-service, ai-agent-service, notification-service, auth-service) with the database seeded.

**Two API calls:**

1. **Activate** the workflow (seeded as `paused`):

```
PATCH /api/v1/workflows/{id}/activate
Authorization: Bearer <jwt>
```

2. **Trigger** it with a payload describing the incident:

```
POST /api/v1/workflows/{id}/trigger
Authorization: Bearer <jwt>

{
  "metric": "db_connection_pool_usage",
  "value": "95%",
  "threshold": "80%",
  "severity": "P2",
  "window": "5m"
}
```

The `/trigger` endpoint (`workflow.service.ts:105`) checks the workflow is active, then hands off to `WorkflowRunService.execute()`.

## Step-by-Step Execution

The runner (`workflow-run.service.ts:29`) executes 6 steps sequentially, passing outputs forward as context (`trigger.*` and `step_N.*`):

| # | Step | Type | What it does |
|---|------|------|-------------|
| 0 | **Check Alert Severity** | `condition` | Resolves `trigger.severity` from the payload. If truthy continues; falsy branches to `false` and stops. |
| 1 | **AI Root Cause Analysis** | `ai_agent` | POSTs the interpolated prompt (with `trigger.metric`, `trigger.value`, etc.) to `ai-agent-service /api/v1/agents/run`. Returns the AI diagnosis and confidence score. **Retries 3x with 2s delay.** |
| 2 | **Create Incident Ticket** | `http_request` | POSTs to `https://tickets.quorvexa.dev/api/v1/incidents` with title, severity, and the AI diagnosis from step 1 (`{{step_1.output}}`). Returns ticket ID. **Retries 5x with 3s delay.** |
| 3 | **Page On-Call Engineer** | `notification` | Calls `notification-service /api/v1/notifications/send` with channel=sms. Sends incident details + AI diagnosis to the on-call phone number. **Retries 5x with 2s delay.** |
| 4 | **Post to War Room** | `notification` | Same notification service, channel=slack to `#incident-war-room`. Includes ticket link, severity, and AI diagnosis. **Retries 3x with 1s delay.** |
| 5 | **Log to Audit Trail** | `action` | Local action step — records incident ID, metric, and root cause. **Retries 10x with 5s delay** (most aggressive retry since audit logging is critical). |

## Key Mechanics

- Each step's output is saved to `context.step_N` so later steps can reference it via `{{step_1.output}}`, `{{step_2.body.ticketId}}`, etc.
- If any step fails after all retries, the workflow **stops** — no subsequent steps run.
- All step results (status + output) are persisted to the database after each step.

## Production Wiring

In production, wire a monitoring system (Datadog, PagerDuty, etc.) to hit the `/trigger` endpoint automatically when an alert fires, rather than calling it manually.
