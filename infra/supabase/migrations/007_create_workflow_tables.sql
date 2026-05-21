-- ============================================================
-- Migration 007: Workflow service tables (workflows, workflow_steps)
-- ============================================================

-- ── workflows ──────────────────────────────────────────────
CREATE TABLE public.workflows (
    id              uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId"      varchar(36)             NOT NULL,
    "createdBy"     uuid                    NOT NULL,
    name            varchar(255)            NOT NULL,
    description     text,
    status          public.workflow_status  NOT NULL DEFAULT 'draft',
    "triggerType"   public.trigger_type     NOT NULL DEFAULT 'manual',
    "cronExpression" varchar(100),
    "webhookSecret" varchar(255),
    metadata        jsonb                   NOT NULL DEFAULT '{}',
    "runCount"      int                     NOT NULL DEFAULT 0,
    "lastRunAt"     timestamptz,
    "createdAt"     timestamptz             NOT NULL DEFAULT now(),
    "updatedAt"     timestamptz             NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflows_tenant_id  ON public.workflows ("tenantId");
CREATE INDEX idx_workflows_created_by ON public.workflows ("createdBy");

-- ── workflow_steps ─────────────────────────────────────────
CREATE TABLE public.workflow_steps (
    id            uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
    "workflowId"  uuid                    NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    name          varchar(255)            NOT NULL,
    type          public.step_type        NOT NULL,
    "order"       int                     NOT NULL,
    config        jsonb                   NOT NULL DEFAULT '{}',
    "lastOutput"  jsonb,
    "lastStatus"  public.step_status      NOT NULL DEFAULT 'pending',
    "maxRetries"  int                     NOT NULL DEFAULT 3,
    "retryDelayMs" int                    NOT NULL DEFAULT 0,
    "createdAt"   timestamptz             NOT NULL DEFAULT now(),
    "updatedAt"   timestamptz             NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_steps_workflow_id ON public.workflow_steps ("workflowId");
