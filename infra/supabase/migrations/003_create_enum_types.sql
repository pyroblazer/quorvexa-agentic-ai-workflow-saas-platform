-- ============================================================
-- Migration 003: Create enum types
-- Runs before table creation so columns can reference them.
-- ============================================================

-- Auth service enums
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'member', 'viewer');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE public.audit_action AS ENUM (
    'login', 'logout', 'register', 'password_change',
    'password_reset_request', 'token_refresh', 'login_failed',
    'account_locked', 'oauth_login'
);

-- User service enums
CREATE TYPE public.user_profile_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE public.theme AS ENUM ('light', 'dark', 'system');
CREATE TYPE public.date_format AS ENUM ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD');

-- Notification service enums
CREATE TYPE public.notification_channel AS ENUM ('email', 'webhook', 'in_app', 'sms', 'slack');
CREATE TYPE public.notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read');

-- Workflow service enums
CREATE TYPE public.workflow_status AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE public.trigger_type AS ENUM ('manual', 'scheduled', 'webhook', 'event');
CREATE TYPE public.step_type AS ENUM ('action', 'condition', 'ai_agent', 'http_request', 'notification', 'delay', 'transform');
CREATE TYPE public.step_status AS ENUM ('pending', 'running', 'completed', 'failed', 'skipped');
