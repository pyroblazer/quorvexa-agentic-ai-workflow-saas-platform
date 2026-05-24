import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@quorvexa/ui';
import { Spinner } from '@quorvexa/ui';

import { StepBuilder } from './step-builder';
import { WorkflowFormPreview } from './workflow-form-preview';
import type { StepDraft } from './step-editor';
import { useCreateWorkflow, useUpdateWorkflow } from '@/hooks/use-workflows';
import type { Workflow } from '@/types/api-types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  triggerType: z.enum(['manual', 'scheduled', 'webhook', 'event']),
  cronExpression: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface WorkflowFormProps {
  mode: 'create' | 'edit';
  initialData?: Workflow;
}

export function WorkflowForm({ mode, initialData }: WorkflowFormProps) {
  const router = useRouter();
  const createWf = useCreateWorkflow();
  const updateWf = useUpdateWorkflow();
  const [steps, setSteps] = useState<StepDraft[]>(
    initialData?.steps?.map((s) => ({
      tempId: s.id,
      name: s.name,
      type: s.type,
      order: s.order,
      config: s.config ?? {},
      maxRetries: s.maxRetries ?? 3,
      retryDelayMs: s.retryDelayMs ?? 0,
    })) ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      triggerType: (initialData?.triggerType as FormValues['triggerType']) ?? 'manual',
      cronExpression: initialData?.cronExpression ?? '',
    },
  });

  const triggerType = watch('triggerType');

  const onSubmit = async (data: FormValues) => {
    setError(null);
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        triggerType: data.triggerType,
        cronExpression: data.triggerType === 'scheduled' ? data.cronExpression : undefined,
        steps: steps.map((s, i) => ({
          name: s.name || `Step ${i + 1}`,
          type: s.type,
          order: i,
          config: s.config,
          maxRetries: s.maxRetries,
          retryDelayMs: s.retryDelayMs,
        })),
      };

      if (mode === 'create') {
        const created = await createWf.mutateAsync(payload);
        router.push(`/dashboard/workflows/${created.id}`);
      } else if (initialData) {
        await updateWf.mutateAsync({ id: initialData.id, data: payload });
        router.push(`/dashboard/workflows/${initialData.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const isPending = createWf.isPending || updateWf.isPending || isSubmitting;

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form fields */}
        <div className="lg:col-span-3 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="triggerType" className="block text-sm font-medium mb-1">Trigger Type</label>
              <select
                id="triggerType"
                {...register('triggerType')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
                <option value="webhook">Webhook</option>
                <option value="event">Event</option>
              </select>
            </div>
            {triggerType === 'scheduled' && (
              <div>
                <label htmlFor="cronExpression" className="block text-sm font-medium mb-1">Cron Expression</label>
                <input
                  id="cronExpression"
                  type="text"
                  placeholder="*/5 * * * *"
                  {...register('cronExpression')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}
          </div>

          <StepBuilder steps={steps} onChange={setSteps} />
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-3">Preview</h3>
            <WorkflowFormPreview steps={steps} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/workflows')}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isPending}>
          {mode === 'create' ? 'Create Workflow' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
