-- ============================================================
-- Migration 005: User service tables (user_profiles, user_preferences)
-- ============================================================

-- ── user_profiles ──────────────────────────────────────────
CREATE TABLE public.user_profiles (
    id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"       uuid         NOT NULL,
    "firstName"    varchar(100) NOT NULL,
    "lastName"     varchar(100) NOT NULL,
    "avatarUrl"    varchar(500),
    phone          varchar(20),
    title          varchar(255),
    department     varchar(255),
    bio            varchar(500),
    "socialLinks"  jsonb        NOT NULL DEFAULT '{}',
    "tenantId"     varchar(36)  NOT NULL,
    status         public.user_profile_status NOT NULL DEFAULT 'active',
    "lastActiveAt" timestamptz,
    "createdAt"    timestamptz  NOT NULL DEFAULT now(),
    "updatedAt"    timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_user_profiles_user_id ON public.user_profiles ("userId");
CREATE INDEX idx_user_profiles_tenant_id     ON public.user_profiles ("tenantId");

-- ── user_preferences ───────────────────────────────────────
CREATE TABLE public.user_preferences (
    id                     uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"               uuid         NOT NULL,
    theme                  public.theme NOT NULL DEFAULT 'system',
    locale                 varchar(10)  NOT NULL DEFAULT 'en-US',
    "dateFormat"           public.date_format NOT NULL DEFAULT 'YYYY-MM-DD',
    timezone               varchar(50)  NOT NULL DEFAULT 'UTC',
    "notificationSettings" jsonb        NOT NULL DEFAULT '{}',
    "dashboardLayout"      jsonb        NOT NULL DEFAULT '{}',
    "emailNotifications"   boolean      NOT NULL DEFAULT true,
    "twoFactorEnabled"     boolean      NOT NULL DEFAULT false,
    "tenantId"             varchar(36)  NOT NULL,
    "createdAt"            timestamptz  NOT NULL DEFAULT now(),
    "updatedAt"            timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_user_preferences_user_id ON public.user_preferences ("userId");
