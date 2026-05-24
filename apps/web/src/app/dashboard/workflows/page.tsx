'use client';

import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Play, Send, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@quorvexa/ui';
import { Button } from '@quorvexa/ui';

import { useActivateWorkflow, useDeleteWorkflow, useTriggerWorkflow, useWorkflows } from '@/hooks/use-workflows';
import { workflowApi } from '@/lib/api';
import { useWorkflowFilters } from '@/store/workflow-filters.store';
import type { TriggerType, Workflow, WorkflowStatus, WorkflowStep } from '@/types/api-types';

const STATUS_VARIANTS: Record<WorkflowStatus, 'outline' | 'success' | 'warning' | 'default'> = {
  draft: 'outline',
  active: 'success',
  paused: 'warning',
  archived: 'default',
};

export default function WorkflowsPage() {
  const { search, status, triggerType, page, limit, setSearch, setStatus, setTriggerType, setPage } = useWorkflowFilters();
  const { data, isLoading } = useWorkflows(page, limit);

  const filtered = data?.items.filter((wf) => {
    if (status !== 'all' && wf.status !== status) return false;
    if (triggerType !== 'all' && wf.triggerType !== triggerType) return false;
    if (search && !wf.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-sm text-muted-foreground">Manage and monitor your automation workflows</p>
        </div>
        <Link href="/dashboard/workflows/new">
          <Button variant="primary" size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            New Workflow
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Search workflows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap gap-2">
          {(['all', 'draft', 'active', 'paused', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                status === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <span className="mx-1 border-l border-border" />
          {(['all', 'manual', 'scheduled', 'webhook', 'event'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTriggerType(t)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                triggerType === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="rounded-lg border border-border">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-3 w-32 rounded bg-muted" />
                </div>
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {data?.total === 0 ? (
              <>
                No workflows yet.{' '}
                <Link href="/dashboard/workflows/new" className="text-primary hover:underline">
                  Create your first workflow.
                </Link>
              </>
            ) : (
              'No workflows match your filters.'
            )}
          </div>
        ) : (
          <>
            <ul role="list" className="divide-y divide-border">
              {filtered.map((wf) => (
                <WorkflowRow key={wf.id} workflow={wf} />
              ))}
            </ul>
            {data && data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Page {data.page} of {data.pages} ({data.total} total)
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WorkflowRow({ workflow }: { workflow: Workflow }) {
  const [showDelete, setShowDelete] = useState(false);
  const activate = useActivateWorkflow();
  const trigger = useTriggerWorkflow();
  const deleteWf = useDeleteWorkflow();

  return (
    <>
      <li className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/workflows/${workflow.id}`} className="font-medium hover:underline truncate">
              {workflow.name}
            </Link>
            <Badge variant={STATUS_VARIANTS[workflow.status]}>{workflow.status}</Badge>
            <Badge variant="outline">{workflow.triggerType}</Badge>
          </div>
          {workflow.description && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">{workflow.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {workflow.runCount} runs
            {workflow.lastRunAt && ` · Last run ${formatDistanceToNow(new Date(workflow.lastRunAt), { addSuffix: true })}`}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-4">
          {(workflow.status === 'draft' || workflow.status === 'paused') && (
            <Button
              variant="ghost"
              size="sm"
              loading={activate.isPending}
              onClick={() => activate.mutate(workflow.id)}
              aria-label="Activate"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          {workflow.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              loading={trigger.isPending}
              onClick={() => trigger.mutate({ id: workflow.id, payload: {} })}
              aria-label="Trigger"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)} aria-label="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </li>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Delete Workflow</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete &quot;{workflow.name}&quot;? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDelete(false)}>Cancel</Button>
              <Button
                variant="destructive"
                size="sm"
                loading={deleteWf.isPending}
                onClick={() => {
                  deleteWf.mutate(workflow.id, { onSuccess: () => setShowDelete(false) });
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
