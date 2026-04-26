const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? '';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

interface WorkflowSummary {
  id: string;
  name: string;
  status: string;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const workflowApi = {
  list: (params: { page?: number; limit?: number }) =>
    fetchJson<PaginatedResponse<WorkflowSummary>>(
      `/api/v1/workflows?page=${params.page ?? 1}&limit=${params.limit ?? 20}`,
    ),

  get: (id: string) => fetchJson<WorkflowSummary>(`/api/v1/workflows/${id}`),

  create: (data: { name: string; description?: string }) =>
    fetchJson<WorkflowSummary>('/api/v1/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  trigger: (id: string, payload: Record<string, unknown>) =>
    fetchJson<{ success: boolean }>(`/api/v1/workflows/${id}/trigger`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const agentApi = {
  run: (data: { prompt: string; sessionId?: string; config?: Record<string, unknown> }) =>
    fetchJson<{ output: string; sessionId: string }>('/api/v1/agents/run', {
      method: 'POST',
      body: JSON.stringify({ prompt: data.prompt, session_id: data.sessionId, config: data.config ?? {} }),
    }),
};
