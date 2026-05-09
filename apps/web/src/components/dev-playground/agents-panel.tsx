'use client';

import { Button } from '@quorvexa/ui';
import { useState } from 'react';

import { DomainPanel } from './domain-panel';
import { PrefillForm, type FormField } from './prefill-form';

import { agentApi, toolsApi } from '@/lib/api';
import { useDevPlaygroundStore } from '@/store/dev-playground.store';

const SAMPLE_PROMPTS = [
  'Summarize the following text in 3 bullet points',
  'Generate a creative tagline for an AI workflow platform',
  'List 5 best practices for API security',
  'Explain microservices architecture in simple terms',
  'Write a short email welcoming a new team member',
];

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const runFields: FormField[] = [
  { name: 'prompt', label: 'Prompt', defaultValue: 'Summarize the following text in 3 bullet points' },
  { name: 'sessionId', label: 'Session ID (optional)', defaultValue: '' },
];

const embedFields: FormField[] = [
  { name: 'content', label: 'Content', defaultValue: 'Quorvexa is an agentic AI workflow SaaS platform.' },
];

const searchFields: FormField[] = [
  { name: 'query', label: 'Query', defaultValue: 'What is Quorvexa?' },
];

export function AgentsPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const setResponse = useDevPlaygroundStore((s) => s.setResponse);

  const handleRun = async (values: Record<string, string>) => {
    setLoading('run');
    try {
      const result = await agentApi.run({
        prompt: values.prompt,
        sessionId: values.sessionId || undefined,
      });
      setResponse('agents-run', result, 'success');
    } catch (err) {
      setResponse('agents-run', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleQuickRun = async () => {
    setLoading('run');
    try {
      const result = await agentApi.run({ prompt: randomFrom(SAMPLE_PROMPTS) });
      setResponse('agents-run', result, 'success');
    } catch (err) {
      setResponse('agents-run', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleEmbed = async (values: Record<string, string>) => {
    setLoading('embed');
    try {
      const result = await agentApi.embed({ content: values.content });
      setResponse('agents-embed', result, 'success');
    } catch (err) {
      setResponse('agents-embed', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleQuickEmbed = async () => {
    setLoading('embed');
    try {
      const result = await agentApi.embed({
        content: `Sample embedded content — generated at ${new Date().toISOString()}. Quorvexa is an agentic AI workflow SaaS platform for enterprise automation.`,
      });
      setResponse('agents-embed', result, 'success');
    } catch (err) {
      setResponse('agents-embed', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleSearch = async (values: Record<string, string>) => {
    setLoading('search');
    try {
      const result = await agentApi.search({ query: values.query });
      setResponse('agents-search', result, 'success');
    } catch (err) {
      setResponse('agents-search', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleListTools = async () => {
    setLoading('tools');
    try {
      const result = await toolsApi.list();
      setResponse('agents-tools', result, 'success');
    } catch (err) {
      setResponse('agents-tools', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <DomainPanel title="Run Agent" domain="agents-run">
        <div className="mb-3">
          <Button size="sm" variant="outline" onClick={handleQuickRun} loading={loading === 'run'}>
            Quick Run (Random Prompt)
          </Button>
        </div>
        <PrefillForm
          fields={runFields}
          onSubmit={handleRun}
          submitLabel="Run Agent"
          loading={loading === 'run'}
        />
      </DomainPanel>

      <DomainPanel title="Embed Content" domain="agents-embed">
        <div className="mb-3">
          <Button size="sm" variant="outline" onClick={handleQuickEmbed} loading={loading === 'embed'}>
            Quick Embed (Sample)
          </Button>
        </div>
        <PrefillForm
          fields={embedFields}
          onSubmit={handleEmbed}
          submitLabel="Embed"
          loading={loading === 'embed'}
        />
      </DomainPanel>

      <DomainPanel title="Search Memory" domain="agents-search">
        <PrefillForm
          fields={searchFields}
          onSubmit={handleSearch}
          submitLabel="Search"
          loading={loading === 'search'}
        />
      </DomainPanel>

      <DomainPanel title="Available Tools" domain="agents-tools">
        <Button size="sm" variant="outline" onClick={handleListTools} loading={loading === 'tools'}>
          List Tools
        </Button>
      </DomainPanel>
    </div>
  );
}
