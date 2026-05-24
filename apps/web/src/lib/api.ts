import type {
  AgentEmbedResult,
  AgentRunResult,
  AgentSearchResult,
  AuthRefreshResponse,
  AuthRegisterResponse,
  Notification,
  NotificationTemplate,
  PaginatedResponse,
  Tool,
  UserProfile,
  UserPreferences,
  Workflow,
} from '@/types/api-types';

import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? '';

let _isRefreshing = false;
let _refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (_isRefreshing && _refreshPromise) return _refreshPromise;
  _isRefreshing = true;
  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return null;
      const data = await res.json() as { accessToken: string };
      const store = useAuthStore.getState();
      if (store.user) {
        store.setTokens(data.accessToken, store.user);
      }
      return data.accessToken;
    } catch {
      return null;
    } finally {
      _isRefreshing = false;
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE}${url}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (response.status === 401 && accessToken) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE}${url}`, {
        ...init,
        credentials: 'include',
        headers,
      });
    } else {
      useAuthStore.getState().logout().catch(() => {});
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const error = await response.json() as { message?: string; error?: string };
      message = error.message ?? error.error ?? message;
    } catch { /* body was empty or non-JSON */ }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string; tenantId?: string }) =>
    fetchJson<AuthRegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refresh: () =>
    fetchJson<AuthRefreshResponse>('/api/v1/auth/refresh', { method: 'POST' }),

  logoutAll: () =>
    fetchJson<void>('/api/v1/auth/sessions', { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const usersApi = {
  list: (params: { page?: number; limit?: number; search?: string; status?: string; department?: string }) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    if (params.status) qs.set('status', params.status);
    if (params.department) qs.set('department', params.department);
    return fetchJson<PaginatedResponse<UserProfile>>(`/api/v1/users?${qs.toString()}`);
  },

  getMe: () => fetchJson<UserProfile>('/api/v1/users/me'),

  getById: (id: string) => fetchJson<UserProfile>(`/api/v1/users/${id}`),

  create: (data: { userId: string; firstName: string; lastName: string; tenantId: string; avatarUrl?: string; phone?: string; title?: string; department?: string; bio?: string }) =>
    fetchJson<UserProfile>('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMe: (data: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'avatarUrl' | 'phone' | 'title' | 'department' | 'bio'>>) =>
    fetchJson<UserProfile>('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateById: (id: string, data: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'avatarUrl' | 'phone' | 'title' | 'department' | 'bio' | 'status'>>) =>
    fetchJson<UserProfile>(`/api/v1/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteById: (id: string) =>
    fetchJson<void>(`/api/v1/users/${id}`, { method: 'DELETE' }),

  suspend: (id: string) =>
    fetchJson<UserProfile>(`/api/v1/users/${id}/suspend`, { method: 'POST' }),

  activate: (id: string) =>
    fetchJson<UserProfile>(`/api/v1/users/${id}/activate`, { method: 'POST' }),
};

// ---------------------------------------------------------------------------
// User Preferences
// ---------------------------------------------------------------------------

export const preferencesApi = {
  get: () => fetchJson<UserPreferences>('/api/v1/users/me/preferences'),

  update: (data: Partial<Pick<UserPreferences, 'theme' | 'locale' | 'dateFormat' | 'timezone' | 'emailNotifications' | 'twoFactorEnabled' | 'notificationSettings' | 'dashboardLayout'>>) =>
    fetchJson<UserPreferences>('/api/v1/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  reset: () =>
    fetchJson<UserPreferences>('/api/v1/users/me/preferences', { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------

export const workflowApi = {
  list: (params: { page?: number; limit?: number }) =>
    fetchJson<PaginatedResponse<Workflow>>(
      `/api/v1/workflows?page=${params.page ?? 1}&limit=${params.limit ?? 20}`,
    ),

  get: (id: string) => fetchJson<Workflow>(`/api/v1/workflows/${id}`),

  create: (data: { name: string; description?: string; triggerType?: string; steps?: Array<{ name: string; type: string; order: number; config?: Record<string, unknown> }> }) =>
    fetchJson<Workflow>('/api/v1/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Pick<Workflow, 'name' | 'description' | 'status' | 'triggerType' | 'cronExpression' | 'metadata'>>) =>
    fetchJson<Workflow>(`/api/v1/workflows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteById: (id: string) =>
    fetchJson<void>(`/api/v1/workflows/${id}`, { method: 'DELETE' }),

  activate: (id: string) =>
    fetchJson<Workflow>(`/api/v1/workflows/${id}/activate`, { method: 'POST' }),

  trigger: (id: string, payload: Record<string, unknown>) =>
    fetchJson<{ success: boolean }>(`/api/v1/workflows/${id}/trigger`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  events: (id: string) => `${API_BASE}/api/v1/workflows/${id}/events`,
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notificationsApi = {
  send: (data: { userId: string; channel: string; subject: string; body: string; recipient: string; metadata?: Record<string, unknown>; maxRetries?: number; templateId?: string }) =>
    fetchJson<Notification>('/api/v1/notifications/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (params: { status?: string; channel?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.channel) qs.set('channel', params.channel);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    return fetchJson<PaginatedResponse<Notification>>(`/api/v1/notifications?${qs.toString()}`);
  },

  listMine: (params: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    return fetchJson<PaginatedResponse<Notification>>(`/api/v1/notifications/me?${qs.toString()}`);
  },

  getById: (id: string) => fetchJson<Notification>(`/api/v1/notifications/${id}`),

  update: (id: string, data: Partial<Pick<Notification, 'subject' | 'body' | 'recipient' | 'metadata'>>) =>
    fetchJson<Notification>(`/api/v1/notifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  markRead: (id: string) =>
    fetchJson<Notification>(`/api/v1/notifications/${id}/read`, { method: 'POST' }),

  retry: (id: string) =>
    fetchJson<Notification>(`/api/v1/notifications/${id}/retry`, { method: 'POST' }),

  deleteById: (id: string) =>
    fetchJson<void>(`/api/v1/notifications/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Notification Templates
// ---------------------------------------------------------------------------

export const templatesApi = {
  list: (params: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    return fetchJson<PaginatedResponse<NotificationTemplate>>(`/api/v1/notifications/templates?${qs.toString()}`);
  },

  getById: (id: string) => fetchJson<NotificationTemplate>(`/api/v1/notifications/templates/${id}`),

  create: (data: { name: string; slug: string; subject: string; bodyTemplate: string; channel: string; defaultValues?: Record<string, unknown>; description?: string }) =>
    fetchJson<NotificationTemplate>('/api/v1/notifications/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Pick<NotificationTemplate, 'name' | 'slug' | 'subject' | 'bodyTemplate' | 'channel' | 'defaultValues' | 'description' | 'isActive'>>) =>
    fetchJson<NotificationTemplate>(`/api/v1/notifications/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  render: (id: string, variables: Record<string, string>) =>
    fetchJson<{ subject: string; body: string }>(`/api/v1/notifications/templates/${id}/render`, {
      method: 'POST',
      body: JSON.stringify({ variables }),
    }),

  deleteById: (id: string) =>
    fetchJson<void>(`/api/v1/notifications/templates/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// AI Agents
// ---------------------------------------------------------------------------

export const agentApi = {
  run: (data: { prompt: string; sessionId?: string; config?: Record<string, unknown> }) =>
    fetchJson<AgentRunResult>('/api/v1/agents/run', {
      method: 'POST',
      body: JSON.stringify({ prompt: data.prompt, session_id: data.sessionId, config: data.config ?? {} }),
    }),

  embed: (data: { content: string; metadata?: Record<string, unknown> }) =>
    fetchJson<AgentEmbedResult>('/api/v1/agents/embed', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  search: (data: { query: string; limit?: number }) =>
    fetchJson<AgentSearchResult>('/api/v1/agents/search', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const toolsApi = {
  list: () => fetchJson<Tool[]>('/api/v1/tools'),
};
