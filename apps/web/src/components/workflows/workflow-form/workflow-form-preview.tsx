import { StepTypeBadge } from './step-type-badge';
import type { StepDraft } from './step-editor';

export function WorkflowFormPreview({ steps }: { steps: StepDraft[] }) {
  if (steps.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Add steps to see a preview
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={step.tempId} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {i + 1}
            </div>
            {i < steps.length - 1 && <div className="w-px flex-1 bg-border min-h-4" />}
          </div>
          <div className="pb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{step.name || 'Untitled'}</span>
              <StepTypeBadge type={step.type} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
