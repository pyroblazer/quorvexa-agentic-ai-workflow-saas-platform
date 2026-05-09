'use client';

import { Button } from '@quorvexa/ui';
import { useState } from 'react';

import { DomainPanel } from './domain-panel';
import { PrefillForm, type FormField } from './prefill-form';

import { notificationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useDevPlaygroundStore } from '@/store/dev-playground.store';


const CHANNELS = ['email', 'webhook', 'in_app', 'sms', 'slack'] as const;

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

const sendFields: FormField[] = [
  { name: 'channel', label: 'Channel', type: 'select', defaultValue: 'in_app', options: ['email', 'webhook', 'in_app', 'sms', 'slack'] },
  { name: 'subject', label: 'Subject', defaultValue: 'Test Notification' },
  { name: 'body', label: 'Body', defaultValue: 'Hello from the playground!' },
  { name: 'recipient', label: 'Recipient', defaultValue: '' },
];

export function NotificationsPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const [notifId, setNotifId] = useState('');
  const setResponse = useDevPlaygroundStore((s) => s.setResponse);
  const user = useAuthStore((s) => s.user);

  const handleList = async () => {
    setLoading('list');
    try {
      const result = await notificationsApi.list({ page: 1, limit: 10 });
      setResponse('notifications-list', result, 'success');
    } catch (err) {
      setResponse('notifications-list', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleListMine = async () => {
    setLoading('list-mine');
    try {
      const result = await notificationsApi.listMine({ page: 1, limit: 10 });
      setResponse('notifications-list', result, 'success');
    } catch (err) {
      setResponse('notifications-list', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateSample = async () => {
    setLoading('send');
    const suffix = randomSuffix();
    const channel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
    try {
      const result = await notificationsApi.send({
        userId: user?.id ?? '',
        channel,
        subject: `Test Notification ${suffix}`,
        body: `This is an auto-generated ${channel} notification from the playground.`,
        recipient: user?.email ?? 'admin@quorvexa.dev',
      });
      setResponse('notifications-send', result, 'success');
      setNotifId((result as { id?: string }).id ?? '');
    } catch (err) {
      setResponse('notifications-send', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleSend = async (values: Record<string, string>) => {
    setLoading('send');
    try {
      const result = await notificationsApi.send({
        userId: user?.id ?? '',
        channel: values.channel,
        subject: values.subject,
        body: values.body,
        recipient: values.recipient || (user?.email ?? ''),
      });
      setResponse('notifications-send', result, 'success');
      setNotifId((result as { id?: string }).id ?? '');
    } catch (err) {
      setResponse('notifications-send', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleMarkRead = async () => {
    if (!notifId) return;
    setLoading('read');
    try {
      const result = await notificationsApi.markRead(notifId);
      setResponse('notifications-action', result, 'success');
    } catch (err) {
      setResponse('notifications-action', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleRetry = async () => {
    if (!notifId) return;
    setLoading('retry');
    try {
      const result = await notificationsApi.retry(notifId);
      setResponse('notifications-action', result, 'success');
    } catch (err) {
      setResponse('notifications-action', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!notifId) return;
    setLoading('delete');
    try {
      await notificationsApi.deleteById(notifId);
      setResponse('notifications-action', { success: true, deleted: notifId }, 'success');
      setNotifId('');
    } catch (err) {
      setResponse('notifications-action', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <DomainPanel title="Send Notification" domain="notifications-send">
        <div className="mb-3">
          <Button size="sm" variant="outline" onClick={handleGenerateSample} loading={loading === 'send'}>
            Generate Sample Notification
          </Button>
        </div>
        <PrefillForm
          fields={sendFields}
          onSubmit={handleSend}
          submitLabel="Send Notification"
          loading={loading === 'send'}
        />
      </DomainPanel>

      <DomainPanel title="Notification Actions" domain="notifications-action">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label htmlFor="notif-id" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Notification ID:
            </label>
            <input
              id="notif-id"
              type="text"
              value={notifId}
              onChange={(e) => setNotifId(e.target.value)}
              placeholder="Auto-filled after send"
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleList} loading={loading === 'list'}>
              List All
            </Button>
            <Button size="sm" variant="outline" onClick={handleListMine} loading={loading === 'list-mine'}>
              List Mine
            </Button>
            <Button size="sm" onClick={handleMarkRead} loading={loading === 'read'} disabled={!notifId}>
              Mark Read
            </Button>
            <Button size="sm" variant="outline" onClick={handleRetry} loading={loading === 'retry'} disabled={!notifId}>
              Retry Failed
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete} loading={loading === 'delete'} disabled={!notifId}>
              Delete
            </Button>
          </div>
        </div>
      </DomainPanel>
    </div>
  );
}
