'use client';

import { Spinner } from '@quorvexa/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { WorkflowForm } from '@/components/workflows/workflow-form/workflow-form';
import { useWorkflow } from '@/hooks/use-workflows';

export default function EditWorkflowPage() {
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
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href="/dashboard/workflows" className="hover:underline">Workflows</Link>
          <span>/</span>
          <Link href={`/dashboard/workflows/${workflow.id}`} className="hover:underline">{workflow.name}</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">Edit Workflow</h1>
      </div>
      <WorkflowForm mode="edit" initialData={workflow} />
    </div>
  );
}
