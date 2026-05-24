import { useMutation, useQuery } from '@tanstack/react-query';

import { agentApi, toolsApi } from '@/lib/api';

export function useAgentRun() {
  return useMutation({
    mutationFn: (data: { prompt: string; sessionId?: string; config?: Record<string, unknown> }) =>
      agentApi.run(data),
  });
}

export function useAgentEmbed() {
  return useMutation({
    mutationFn: (data: { content: string; metadata?: Record<string, unknown> }) =>
      agentApi.embed(data),
  });
}

export function useAgentSearch() {
  return useMutation({
    mutationFn: (data: { query: string; limit?: number }) =>
      agentApi.search(data),
  });
}

export function useTools() {
  return useQuery({
    queryKey: ['tools'],
    queryFn: () => toolsApi.list(),
  });
}
