'use client';

import { Badge, Button } from '@quorvexa/ui';
import { useState } from 'react';

import type { StepStatus } from '@/store/dev-playground.store';

const statusBadge: Record<StepStatus, 'default' | 'success' | 'warning' | 'destructive'> = {
  pending: 'default',
  running: 'warning',
  completed: 'success',
  failed: 'destructive',
};

const statusLabel: Record<StepStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Done',
  failed: 'Failed',
};

interface SimulationStepProps {
  stepNumber: number;
  description: string;
  status: StepStatus;
  canExecute: boolean;
  onExecute: () => Promise<void>;
  response?: unknown;
}

export function SimulationStep({
  stepNumber,
  description,
  status,
  canExecute,
  onExecute,
  response,
}: SimulationStepProps) {
  const [expanded, setExpanded] = useState(false);

  const handleExecute = () => {
    void onExecute();
  };

  return (
    <div className="flex items-start gap-3 rounded border border-border p-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {stepNumber}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{description}</p>
          <Badge variant={statusBadge[status]}>{statusLabel[status]}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={status === 'completed' ? 'ghost' : 'primary'}
            onClick={handleExecute}
            disabled={!canExecute || status === 'running'}
            loading={status === 'running'}
          >
            {status === 'completed' ? 'Re-run' : 'Execute'}
          </Button>
          {response && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? 'Hide' : 'Show'} response
            </button>
          )}
        </div>
        {expanded && response && (
          <pre className="max-h-40 overflow-auto rounded border border-border bg-muted/50 p-2 text-xs font-mono whitespace-pre-wrap">
            {JSON.stringify(response, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
