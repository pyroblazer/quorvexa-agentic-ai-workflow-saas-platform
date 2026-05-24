import { Button } from '@quorvexa/ui';
import { Plus } from 'lucide-react';


import { StepEditor, type StepDraft } from './step-editor';

import type { StepType } from '@/types/api-types';

let tempIdCounter = 0;

interface StepBuilderProps {
  steps: StepDraft[];
  onChange: (steps: StepDraft[]) => void;
}

export function StepBuilder({ steps, onChange }: StepBuilderProps) {
  const addStep = () => {
    const newStep: StepDraft = {
      tempId: `step-${++tempIdCounter}`,
      name: '',
      type: 'action' as StepType,
      order: steps.length,
      config: {},
      maxRetries: 3,
      retryDelayMs: 0,
    };
    onChange([...steps, newStep]);
  };

  const updateStep = (index: number, updated: StepDraft) => {
    const next = [...steps];
    next[index] = updated;
    onChange(next);
  };

  const removeStep = (index: number) => {
    const next = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }));
    onChange(next);
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((s, i) => ({ ...s, order: i })));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Steps</h3>
        <Button variant="outline" size="sm" onClick={addStep}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Step
        </Button>
      </div>
      {steps.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
          No steps yet. Click &quot;Add Step&quot; to define your workflow.
        </p>
      )}
      <div className="space-y-2">
        {steps.map((step, i) => (
          <StepEditor
            key={step.tempId}
            step={step}
            isFirst={i === 0}
            isLast={i === steps.length - 1}
            onChange={(s) => updateStep(i, s)}
            onRemove={() => removeStep(i)}
            onMoveUp={() => moveStep(i, -1)}
            onMoveDown={() => moveStep(i, 1)}
          />
        ))}
      </div>
    </div>
  );
}
