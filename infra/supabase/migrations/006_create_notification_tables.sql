-- ============================================================
-- Migration 006: Notification service tables (notifications, notification_templates)
-- ============================================================

-- ── notification_templates ─────────────────────────────────
CREATE TABLE public.notification_templates (
    id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId"      varchar(36)  NOT NULL,
    name            varchar(255) NOT NULL,
    slug            varchar(100) NOT NULL,
    subject         varchar(500) NOT NULL,
    "bodyTemplate"  text         NOT NULL,
    channel         varchar(50)  NOT NULL,
    "defaultValues" jsonb        NOT NULL DEFAULT '{}',
    description     text,
    "isActive"      boolean      NOT NULL DEFAULT true,
    "createdAt"     timestamptz  NOT NULL DEFAULT now(),
    "updatedAt"     timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_templates_tenant_id ON public.notification_templates ("tenantId");

-- ── notifications ──────────────────────────────────────────
CREATE TABLE public.notifications (
    id              uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"        uuid                        NOT NULL,
    "tenantId"      varchar(36)                 NOT NULL,
    channel         public.notification_channel NOT NULL,
    status          public.notification_status  NOT NULL DEFAULT 'pending',
    subject         varchar(500)                NOT NULL,
    body            text                        NOT NULL,
    recipient       varchar(500)                NOT NULL,
    metadata        jsonb                       NOT NULL DEFAULT '{}',
    "retryCount"    int                         NOT NULL DEFAULT 0,
    "maxRetries"    int                         NOT NULL DEFAULT 3,
    "sentAt"        timestamptz,
    "readAt"        timestamptz,
    "errorMessage"  varchar(1000),
    "templateId"    uuid                        REFERENCES public.notification_templates(id) ON DELETE SET NULL,
    "createdAt"     timestamptz                 NOT NULL DEFAULT now(),
    "updatedAt"     timestamptz                 NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id    ON public.notifications ("userId");
CREATE INDEX idx_notifications_tenant_id  ON public.notifications ("tenantId");
