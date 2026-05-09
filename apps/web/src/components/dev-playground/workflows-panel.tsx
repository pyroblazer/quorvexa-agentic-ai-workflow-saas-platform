'use client';

import { Button } from '@quorvexa/ui';
import { useState } from 'react';

import { DomainPanel } from './domain-panel';
import { PrefillForm, type FormField } from './prefill-form';

import { workflowApi } from '@/lib/api';
import { useDevPlaygroundStore } from '@/store/dev-playground.store';


const TRIGGER_TYPES = ['manual', 'scheduled', 'webhook', 'event'] as const;

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

const createFields: FormField[] = [
  { name: 'name', label: 'Name', defaultValue: 'Test Workflow' },
  { name: 'description', label: 'Description', defaultValue: 'Created from playground' },
  { name: 'triggerType', label: 'Trigger Type', type: 'select', defaultValue: 'manual', options: [...TRIGGER_TYPES] },
];

export function WorkflowsPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const [wfId, setWfId] = useState('');
  const setResponse = useDevPlaygroundStore((s) => s.setResponse);
  const responses = useDevPlaygroundStore((s) => s.responses);

  const lastCreated = responses['workflows-create']?.data as { id?: string } | undefined;
  const targetId = wfId || lastCreated?.id || '';

  const handleList = async () => {
    setLoading('list');
    try {
      const result = await workflowApi.list({ page: 1, limit: 10 });
      setResponse('workflows-list', result, 'success');
    } catch (err) {
      setResponse('workflows-list', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleCreate = async (values: Record<string, string>) => {
    setLoading('create');
    try {
      const result = await workflowApi.create({
        name: values.name,
        description: values.description,
        triggerType: values.triggerType,
      });
      setResponse('workflows-create', result, 'success');
      setWfId((result as { id?: string }).id ?? '');
    } catch (err) {
      setResponse('workflows-create', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateSample = async () => {
    setLoading('create');
    const suffix = randomSuffix();
    const trigger = TRIGGER_TYPES[Math.floor(Math.random() * TRIGGER_TYPES.length)];
    try {
      const result = await workflowApi.create({
        name: `Sample Workflow ${suffix}`,
        description: `Auto-generated sample workflow (${trigger} trigger)`,
        triggerType: trigger,
      });
      setResponse('workflows-create', result, 'success');
      setWfId((result as { id?: string }).id ?? '');
    } catch (err) {
      setResponse('workflows-create', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleActivate = async () => {
    if (!targetId) return;
    setLoading('activate');
    try {
      const result = await workflowApi.activate(targetId);
      setResponse('workflows-action', result, 'success');
    } catch (err) {
      setResponse('workflows-action', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleTrigger = async () => {
    if (!targetId) return;
    setLoading('trigger');
    try {
      const result = await workflowApi.trigger(targetId, {});
      setResponse('workflows-action', result, 'success');
    } catch (err) {
      setResponse('workflows-action', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleGet = async () => {
    if (!targetId) return;
    setLoading('get');
    try {
      const result = await workflowApi.get(targetId);
      setResponse('workflows-action', result, 'success');
    } catch (err) {
      setResponse('workflows-action', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!targetId) return;
    setLoading('delete');
    try {
      await workflowApi.deleteById(targetId);
      setResponse('workflows-action', { success: true, deleted: targetId }, 'success');
      setWfId('');
    } catch (err) {
      setResponse('workflows-action', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <DomainPanel title="Create Workflow" domain="workflows-create">
        <div className="mb-3">
          <Button size="sm" variant="outline" onClick={handleGenerateSample} loading={loading === 'create'}>
            Generate Sample Workflow
          </Button>
        </div>
        <PrefillForm
          fields={createFields}
          onSubmit={handleCreate}
          submitLabel="Create Workflow"
          loading={loading === 'create'}
        />
      </DomainPanel>

      <DomainPanel title="Workflow Actions" domain="workflows-action">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label htmlFor="wf-id" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Workflow ID:
            </label>
            <input
              id="wf-id"
              type="text"
              value={targetId}
              onChange={(e) => setWfId(e.target.value)}
              placeholder="Enter or auto-filled after create"
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleList} loading={loading === 'list'}>
              List All
            </Button>
            <Button size="sm" variant="outline" onClick={handleGet} loading={loading === 'get'} disabled={!targetId}>
              Get Details
            </Button>
            <Button size="sm" onClick={handleActivate} loading={loading === 'activate'} disabled={!targetId}>
              Activate
            </Button>
            <Button size="sm" onClick={handleTrigger} loading={loading === 'trigger'} disabled={!targetId}>
              Trigger Run
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete} loading={loading === 'delete'} disabled={!targetId}>
              Delete
            </Button>
          </div>
        </div>
      </DomainPanel>
    </div>
  );
}
