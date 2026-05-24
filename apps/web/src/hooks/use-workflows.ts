import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { workflowApi } from '@/lib/api';
import type { Workflow, WorkflowStep } from '@/types/api-types';

export function useWorkflows(page: number, limit: number) {
  return useQuery({
    queryKey: ['workflows', { page, limit }],
    queryFn: () => workflowApi.list({ page, limit }),
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => workflowApi.get(id),
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof workflowApi.create>[0]) => workflowApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof workflowApi.update>[1] }) =>
      workflowApi.update(id, data),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['workflows'] });
      void qc.invalidateQueries({ queryKey: ['workflow', variables.id] });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowApi.deleteById(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useActivateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowApi.activate(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ['workflows'] });
      void qc.invalidateQueries({ queryKey: ['workflow', id] });
    },
  });
}

export function useTriggerWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      workflowApi.trigger(id, payload),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['workflow', variables.id] });
      void qc.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}
