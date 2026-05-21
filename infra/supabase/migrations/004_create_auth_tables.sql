-- ============================================================
-- Migration 004: Auth service tables (users, refresh_tokens, audit_logs)
-- ============================================================

-- ── users ──────────────────────────────────────────────────
CREATE TABLE public.users (
    id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email                 varchar(255) NOT NULL,
    "passwordHash"        varchar(255),
    "firstName"           varchar(100) NOT NULL,
    "lastName"            varchar(100) NOT NULL,
    role                  public.user_role NOT NULL DEFAULT 'member',
    status                public.user_status NOT NULL DEFAULT 'pending_verification',
    "tenantId"            varchar(36) NOT NULL,
    "oauthProvider"       varchar(50),
    "oauthId"             varchar(255),
    "avatarUrl"           varchar(500),
    "emailVerifiedAt"     timestamptz,
    "lastLoginAt"         timestamptz,
    "failedLoginAttempts" int         NOT NULL DEFAULT 0,
    "lockedUntil"         timestamptz,
    "createdAt"           timestamptz NOT NULL DEFAULT now(),
    "updatedAt"           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_users_tenant_id    ON public.users ("tenantId");

-- ── refresh_tokens ─────────────────────────────────────────
CREATE TABLE public.refresh_tokens (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    "tokenHash" varchar(500) NOT NULL,
    "userId"    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    "expiresAt" timestamptz NOT NULL,
    "ipAddress" varchar(45),
    "userAgent" varchar(500),
    "isRevoked" boolean     NOT NULL DEFAULT false,
    "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_token_hash ON public.refresh_tokens ("tokenHash");
CREATE INDEX idx_refresh_tokens_user_id    ON public.refresh_tokens ("userId");

-- ── audit_logs ─────────────────────────────────────────────
CREATE TABLE public.audit_logs (
    id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"     uuid,
    action       public.audit_action NOT NULL,
    "ipAddress"  varchar(45),
    "userAgent"  varchar(500),
    metadata     jsonb,
    success      boolean        NOT NULL DEFAULT true,
    "errorMessage" varchar(500),
    "createdAt"  timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs ("userId");
