'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { Edit, Pause, Archive, Play, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@quorvexa/ui';
import { Button } from '@quorvexa/ui';
import { Card, CardContent, CardHeader } from '@quorvexa/ui';
import { Spinner } from '@quorvexa/ui';

import { StepTypeBadge } from '@/components/workflows/workflow-form/step-type-badge';
import { useActivateWorkflow, useDeleteWorkflow, useTriggerWorkflow, useUpdateWorkflow, useWorkflow } from '@/hooks/use-workflows';
import type { StepStatus, WorkflowStatus, WorkflowStep } from '@/types/api-types';

const STATUS_VARIANTS: Record<WorkflowStatus, 'outline' | 'success' | 'warning' | 'default'> = {
  draft: 'outline',
  active: 'success',
  paused: 'warning',
  archived: 'default',
};

const STEP_STATUS_VARIANTS: Record<StepStatus, 'outline' | 'default' | 'success' | 'destructive'> = {
  pending: 'outline',
  running: 'default',
  completed: 'success',
  failed: 'destructive',
  skipped: 'outline',
};

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: workflow, isLoading } = useWorkflow(params.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" label="Loading workflow..." />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Workflow not found.{' '}
        <Link href="/dashboard/workflows" className="text-primary hover:underline">Back to workflows</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <DetailHeader workflow={workflow} />

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Steps ({workflow.steps?.length ?? 0})</h2>
            </div>
            {(!workflow.steps || workflow.steps.length === 0) ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No steps defined.{' '}
                <Link href={`/dashboard/workflows/${workflow.id}/edit`} className="text-primary hover:underline">
                  Edit the workflow
                </Link>{' '}
                to add steps.
              </div>
            ) : (
              <StepTimeline steps={workflow.steps} />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <InfoCard workflow={workflow} />
        </div>
      </div>
    </div>
  );
}

function DetailHeader({ workflow }: { workflow: NonNullable<ReturnType<typeof useWorkflow>['data']> }) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [showTrigger, setShowTrigger] = useState(false);
  const activate = useActivateWorkflow();
  const updateWf = useUpdateWorkflow();
  const deleteWf = useDeleteWorkflow();

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/workflows" className="hover:underline">Workflows</Link>
          <span>/</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{workflow.name}</h1>
            <Badge variant={STATUS_VARIANTS[workflow.status]}>{workflow.status}</Badge>
            <Badge variant="outline">{workflow.triggerType}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/workflows/${workflow.id}/edit`}>
              <Button variant="outline" size="sm"><Edit className="mr-1.5 h-4 w-4" />Edit</Button>
            </Link>
            {(workflow.status === 'draft' || workflow.status === 'paused') && (
              <Button variant="primary" size="sm" loading={activate.isPending} onClick={() => activate.mutate(workflow.id)}>
                <Play className="mr-1.5 h-4 w-4" />Activate
              </Button>
            )}
            {workflow.status === 'active' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowTrigger(true)}>
                  <Send className="mr-1.5 h-4 w-4" />Trigger
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateWf.mutate({ id: workflow.id, data: { status: 'paused' } })}>
                  <Pause className="mr-1.5 h-4 w-4" />Pause
                </Button>
              </>
            )}
            {workflow.status === 'paused' && (
              <Button variant="outline" size="sm" onClick={() => updateWf.mutate({ id: workflow.id, data: { status: 'archived' } })}>
                <Archive className="mr-1.5 h-4 w-4" />Archive
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" />Delete
            </Button>
          </div>
        </div>
        {workflow.description && (
          <p className="text-sm text-muted-foreground">{workflow.description}</p>
        )}
      </div>

      {showDelete && (
        <DeleteDialog
          name={workflow.name}
          isPending={deleteWf.isPending}
          onConfirm={() => deleteWf.mutate(workflow.id, { onSuccess: () => router.push('/dashboard/workflows') })}
          onClose={() => setShowDelete(false)}
        />
      )}
      {showTrigger && (
        <TriggerDialog
          isPending={false}
          onConfirm={(payload) => {
            useTriggerWorkflow().mutate({ id: workflow.id, payload });
            setShowTrigger(false);
          }}
          onClose={() => setShowTrigger(false)}
        />
      )}
    </>
  );
}

function StepTimeline({ steps }: { steps: WorkflowStep[] }) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  return (
    <div className="p-4 space-y-0">
      {sorted.map((step, i) => (
        <div key={step.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {i + 1}
            </div>
            {i < sorted.length - 1 && <div className="w-px flex-1 bg-border min-h-4" />}
          </div>
          <div className="pb-4 flex-1">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 p-3 pb-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{step.name}</span>
                  <StepTypeBadge type={step.type} />
                </div>
                <Badge variant={STEP_STATUS_VARIANTS[step.lastStatus ?? 'pending']}>
                  {step.lastStatus ?? 'pending'}
                </Badge>
              </CardHeader>
              <CardContent className="p-3 pt-2 text-xs text-muted-foreground space-y-1">
                <p>Order: {step.order} · Retries: {step.maxRetries} · Delay: {step.retryDelayMs}ms</p>
                {step.config && Object.keys(step.config).length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-primary">Config</summary>
                    <pre className="mt-1 rounded bg-muted/50 p-2 text-xs overflow-auto">{JSON.stringify(step.config, null, 2)}</pre>
                  </details>
                )}
                {step.lastOutput && (
                  <details>
                    <summary className="cursor-pointer text-primary">Last Output</summary>
                    <pre className="mt-1 rounded bg-muted/50 p-2 text-xs overflow-auto">{JSON.stringify(step.lastOutput, null, 2)}</pre>
                  </details>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoCard({ workflow }: { workflow: NonNullable<ReturnType<typeof useWorkflow>['data']> }) {
  const rows: [string, string | React.ReactNode][] = [
    ['Trigger', workflow.triggerType],
    ...(workflow.cronExpression ? [['Cron', <code className="text-xs">{workflow.cronExpression}</code>]] as [string, React.ReactNode][] : []),
    ['Runs', String(workflow.runCount)],
    ['Last Run', workflow.lastRunAt ? formatDistanceToNow(new Date(workflow.lastRunAt), { addSuffix: true }) : 'Never'],
    ['Created', format(new Date(workflow.createdAt), 'PP pp')],
    ['Updated', formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })],
  ];

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <h3 className="text-sm font-semibold">Details</h3>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DeleteDialog({ name, isPending, onConfirm, onClose }: { name: string; isPending: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Delete Workflow</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to delete &quot;{name}&quot;? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" size="sm" loading={isPending} onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}

function TriggerDialog({ isPending, onConfirm, onClose }: { isPending: boolean; onConfirm: (payload: Record<string, unknown>) => void; onClose: () => void }) {
  const [text, setText] = useState('{}');
  const [error, setError] = useState<string | null>(null);

  const handleTrigger = () => {
    try {
      const parsed = JSON.parse(text);
      onConfirm(parsed);
    } catch {
      setError('Invalid JSON');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Trigger Workflow</h2>
        <p className="mt-2 text-sm text-muted-foreground">Provide a JSON payload (or leave as {`{}`}).</p>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          rows={5}
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" loading={isPending} onClick={handleTrigger}>Trigger</Button>
        </div>
      </div>
    </div>
  );
}
