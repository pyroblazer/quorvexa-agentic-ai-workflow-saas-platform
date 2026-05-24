'use client';

import { WorkflowForm } from '@/components/workflows/workflow-form/workflow-form';

export default function NewWorkflowPage() {
  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Create Workflow</h1>
        <p className="text-sm text-muted-foreground">Define a new workflow and its steps.</p>
      </div>
      <WorkflowForm mode="create" />
    </div>
  );
}
