'use client';

import { Button } from '@quorvexa/ui';
import { useState } from 'react';

import { DomainPanel } from './domain-panel';
import { PrefillForm, type FormField } from './prefill-form';

import { preferencesApi } from '@/lib/api';
import { useDevPlaygroundStore } from '@/store/dev-playground.store';

const updateFields: FormField[] = [
  { name: 'theme', label: 'Theme', type: 'select', defaultValue: 'dark', options: ['light', 'dark', 'system'] },
  { name: 'locale', label: 'Locale', defaultValue: 'en-US', placeholder: 'e.g. en-US, fr-FR, de-DE' },
  { name: 'timezone', label: 'Timezone', defaultValue: 'America/New_York', placeholder: 'e.g. America/New_York, Europe/London' },
  { name: 'dateFormat', label: 'Date Format', type: 'select', defaultValue: 'YYYY-MM-DD', options: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'] },
];

export function PreferencesPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const setResponse = useDevPlaygroundStore((s) => s.setResponse);

  const handleGet = async () => {
    setLoading('get');
    try {
      const result = await preferencesApi.get();
      setResponse('preferences', result, 'success');
    } catch (err) {
      setResponse('preferences', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleUpdate = async (values: Record<string, string>) => {
    setLoading('update');
    try {
      const result = await preferencesApi.update({
        theme: values.theme as 'light' | 'dark' | 'system',
        locale: values.locale,
        timezone: values.timezone,
        dateFormat: values.dateFormat as 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD',
      });
      setResponse('preferences', result, 'success');
    } catch (err) {
      setResponse('preferences', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleReset = async () => {
    setLoading('reset');
    try {
      const result = await preferencesApi.reset();
      setResponse('preferences', result, 'success');
    } catch (err) {
      setResponse('preferences', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <DomainPanel title="User Preferences" domain="preferences">
      <div className="flex gap-2 mb-3">
        <Button size="sm" variant="outline" onClick={handleGet} loading={loading === 'get'}>
          Get Preferences
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset} loading={loading === 'reset'}>
          Reset to Defaults
        </Button>
      </div>
      <div className="border-t border-border pt-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Update Preferences</p>
        <PrefillForm
          fields={updateFields}
          onSubmit={handleUpdate}
          submitLabel="Update"
          loading={loading === 'update'}
        />
      </div>
    </DomainPanel>
  );
}
