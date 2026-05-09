export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface User {
  id: string;
  email: string;
  passwordHash?: never;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  tenantId: string;
  oauthProvider?: string;
  oauthId?: string;
  avatarUrl?: string;
  emailVerifiedAt?: string;
  lastLoginAt?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'super_admin' | 'admin' | 'member' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
  title?: string;
  department?: string;
  bio?: string;
  socialLinks?: Record<string, string>;
  tenantId: string;
  status: 'active' | 'inactive' | 'suspended';
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  locale: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timezone: string;
  notificationSettings?: Record<string, unknown>;
  dashboardLayout?: Record<string, unknown>;
  emailNotifications: boolean;
  twoFactorEnabled: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  tenantId: string;
  createdBy: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  triggerType: TriggerType;
  cronExpression?: string;
  webhookSecret?: string;
  metadata?: Record<string, unknown>;
  runCount: number;
  lastRunAt?: string;
  steps?: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type TriggerType = 'manual' | 'scheduled' | 'webhook' | 'event';

export interface WorkflowStep {
  id: string;
  workflowId: string;
  name: string;
  type: StepType;
  order: number;
  config?: Record<string, unknown>;
  lastOutput?: Record<string, unknown>;
  lastStatus?: StepStatus;
  maxRetries: number;
  retryDelayMs: number;
  createdAt: string;
  updatedAt: string;
}

export type StepType = 'action' | 'condition' | 'ai_agent' | 'http_request' | 'notification' | 'delay' | 'transform';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface Notification {
  id: string;
  userId: string;
  tenantId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  subject: string;
  body: string;
  recipient: string;
  metadata?: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
  sentAt?: string;
  readAt?: string;
  errorMessage?: string;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationChannel = 'email' | 'webhook' | 'in_app' | 'sms' | 'slack';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export interface NotificationTemplate {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  subject: string;
  bodyTemplate: string;
  channel: NotificationChannel;
  defaultValues?: Record<string, unknown>;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunResult {
  output: string;
  sessionId: string;
}

export interface AgentEmbedResult {
  success: boolean;
  pointId?: string;
}

export interface AgentSearchResult {
  results: Array<{
    id: string;
    content: string;
    metadata?: Record<string, unknown>;
    score: number;
  }>;
}

export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export interface AuthRegisterResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

export interface AuthRefreshResponse {
  accessToken: string;
}
