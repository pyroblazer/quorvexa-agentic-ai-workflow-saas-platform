import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { preferencesApi } from '@/lib/api';

export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: () => preferencesApi.get(),
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof preferencesApi.update>[0]) =>
      preferencesApi.update(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['preferences'] });
    },
  });
}

export function useResetPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => preferencesApi.reset(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['preferences'] });
    },
  });
}
