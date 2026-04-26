'use client';

import { useQuery } from '@tanstack/react-query';

import { workflowApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows', { page: 1 }],
    queryFn: () => workflowApi.list({ page: 1, limit: 10 }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
          </p>
        </div>
        <a
          href="/workflows/new"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          New Workflow
        </a>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Workflows', value: workflows?.total ?? '—' },
          { label: 'Active', value: '—' },
          { label: 'Runs Today', value: '—' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{String(stat.value)}</p>
          </div>
        ))}
      </div>

      {/* Workflow list */}
      <div className="rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Recent Workflows</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground" aria-live="polite" aria-busy="true">
            Loading workflows...
          </div>
        ) : workflows?.items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No workflows yet.{' '}
            <a href="/workflows/new" className="text-primary hover:underline">
              Create your first workflow.
            </a>
          </div>
        ) : (
          <ul role="list">
            {workflows?.items.map((wf) => (
              <li
                key={wf.id}
                className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <a href={`/workflows/${wf.id}`} className="font-medium hover:underline">
                    {wf.name}
                  </a>
                  <p className="text-xs text-muted-foreground mt-0.5">{wf.status}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {wf.lastRunAt ? new Date(wf.lastRunAt).toLocaleDateString() : 'Never run'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
