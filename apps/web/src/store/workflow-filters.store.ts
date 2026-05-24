import { create } from 'zustand';

import type { TriggerType, WorkflowStatus } from '@/types/api-types';

interface WorkflowFiltersState {
  search: string;
  status: WorkflowStatus | 'all';
  triggerType: TriggerType | 'all';
  page: number;
  limit: number;
  setSearch: (search: string) => void;
  setStatus: (status: WorkflowStatus | 'all') => void;
  setTriggerType: (triggerType: TriggerType | 'all') => void;
  setPage: (page: number) => void;
  reset: () => void;
}

const defaults = {
  search: '',
  status: 'all' as const,
  triggerType: 'all' as const,
  page: 1,
  limit: 20,
};

export const useWorkflowFilters = create<WorkflowFiltersState>()((set) => ({
  ...defaults,
  setSearch: (search) => set({ search, page: 1 }),
  setStatus: (status) => set({ status, page: 1 }),
  setTriggerType: (triggerType) => set({ triggerType, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set(defaults),
}));
