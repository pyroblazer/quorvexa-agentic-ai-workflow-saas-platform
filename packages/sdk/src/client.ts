export interface ClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null;
}

export class QuorvexaClient {
  private readonly baseUrl: string;
  private readonly getToken: () => string | null;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getToken = options.getAccessToken ?? (() => null);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message ?? `HTTP ${response.status}: ${path}`);
    }

    return response.json() as Promise<T>;
  }

  // Auth
  readonly auth = {
    login: (email: string, password: string) =>
      this.request<{ accessToken: string; refreshToken: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
      this.request<{ accessToken: string }>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    logout: () => this.request<void>('/api/v1/auth/logout', { method: 'DELETE' }),
  };

  // Workflows
  readonly workflows = {
    list: (params?: { page?: number; limit?: number }) => {
      const qs = new URLSearchParams({
        page: String(params?.page ?? 1),
        limit: String(params?.limit ?? 20),
      });
      return this.request<{ items: unknown[]; total: number }>(`/api/v1/workflows?${qs}`);
    },

    get: (id: string) => this.request<unknown>(`/api/v1/workflows/${id}`),

    create: (data: { name: string; description?: string }) =>
      this.request<{ id: string }>('/api/v1/workflows', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    trigger: (id: string, payload?: Record<string, unknown>) =>
      this.request<{ success: boolean }>(`/api/v1/workflows/${id}/trigger`, {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
      }),
  };

  // AI Agents
  readonly agents = {
    run: (prompt: string, sessionId?: string, config?: Record<string, unknown>) =>
      this.request<{ output: string; sessionId: string }>('/api/v1/agents/run', {
        method: 'POST',
        body: JSON.stringify({ prompt, session_id: sessionId, config: config ?? {} }),
      }),
  };
}
