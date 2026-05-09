'use client';

import { Button } from '@quorvexa/ui';
import { useState } from 'react';

import { DomainPanel } from './domain-panel';
import { PrefillForm, type FormField } from './prefill-form';

import { templatesApi } from '@/lib/api';
import { useDevPlaygroundStore } from '@/store/dev-playground.store';


function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

const createFields: FormField[] = [
  { name: 'name', label: 'Name', defaultValue: 'Welcome Email' },
  { name: 'slug', label: 'Slug', defaultValue: 'welcome-email' },
  { name: 'subject', label: 'Subject', defaultValue: 'Welcome to Quorvexa!' },
  { name: 'bodyTemplate', label: 'Body Template', defaultValue: 'Hello {{name}}, welcome aboard!' },
  { name: 'channel', label: 'Channel', type: 'select', defaultValue: 'email', options: ['email', 'webhook', 'in_app', 'sms', 'slack'] },
  { name: 'description', label: 'Description', defaultValue: 'Welcome email for new users' },
];

const renderFields: FormField[] = [
  { name: 'name', label: 'Variable: name', defaultValue: 'John' },
];

export function TemplatesPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState('');
  const setResponse = useDevPlaygroundStore((s) => s.setResponse);
  const responses = useDevPlaygroundStore((s) => s.responses);

  const lastCreated = responses['templates-create']?.data as { id?: string } | undefined;
  const targetId = templateId || lastCreated?.id || '';

  const handleList = async () => {
    setLoading('list');
    try {
      const result = await templatesApi.list({ page: 1, limit: 10 });
      setResponse('templates-list', result, 'success');
    } catch (err) {
      setResponse('templates-list', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleCreate = async (values: Record<string, string>) => {
    setLoading('create');
    try {
      const result = await templatesApi.create({
        name: values.name,
        slug: values.slug,
        subject: values.subject,
        bodyTemplate: values.bodyTemplate,
        channel: values.channel,
        description: values.description,
      });
      setResponse('templates-create', result, 'success');
      setTemplateId((result as { id?: string }).id ?? '');
    } catch (err) {
      setResponse('templates-create', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateSample = async () => {
    setLoading('create');
    const suffix = randomSuffix();
    try {
      const result = await templatesApi.create({
        name: `Sample Template ${suffix}`,
        slug: `sample-${suffix}`,
        subject: `Hello {{name}} — Sample ${suffix}`,
        bodyTemplate: 'Hi {{name}},\n\nThis is a sample notification from template {{slug}}.\n\nRegards,\nQuorvexa',
        channel: 'email',
        description: `Auto-generated sample template (${suffix})`,
      });
      setResponse('templates-create', result, 'success');
      setTemplateId((result as { id?: string }).id ?? '');
    } catch (err) {
      setResponse('templates-create', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleRender = async (values: Record<string, string>) => {
    if (!targetId) return;
    setLoading('render');
    try {
      const result = await templatesApi.render(targetId, values);
      setResponse('templates-render', result, 'success');
    } catch (err) {
      setResponse('templates-render', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!targetId) return;
    setLoading('delete');
    try {
      await templatesApi.deleteById(targetId);
      setResponse('templates-action', { success: true, deleted: targetId }, 'success');
      setTemplateId('');
    } catch (err) {
      setResponse('templates-action', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <DomainPanel title="Create Template" domain="templates-create">
        <div className="mb-3">
          <Button size="sm" variant="outline" onClick={handleGenerateSample} loading={loading === 'create'}>
            Generate Sample Template
          </Button>
        </div>
        <PrefillForm
          fields={createFields}
          onSubmit={handleCreate}
          submitLabel="Create Template"
          loading={loading === 'create'}
        />
      </DomainPanel>

      <DomainPanel title="Template Actions" domain="templates-action">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label htmlFor="template-id" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Template ID:
            </label>
            <input
              id="template-id"
              type="text"
              value={targetId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="Auto-filled after create"
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleList} loading={loading === 'list'}>
              List All
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete} loading={loading === 'delete'} disabled={!targetId}>
              Delete
            </Button>
          </div>
          {targetId && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Render Template</p>
              <PrefillForm
                fields={renderFields}
                onSubmit={handleRender}
                submitLabel="Render"
                loading={loading === 'render'}
              />
            </div>
          )}
        </div>
      </DomainPanel>

      <DomainPanel title="Rendered Output" domain="templates-render">
        <p className="text-xs text-muted-foreground">Output appears here after rendering a template above.</p>
      </DomainPanel>
    </div>
  );
}
