'use client';

import { Button } from '@quorvexa/ui';
import { useState } from 'react';

import { DomainPanel } from './domain-panel';
import { PrefillForm, type FormField } from './prefill-form';

import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useDevPlaygroundStore } from '@/store/dev-playground.store';


const createFields: FormField[] = [
  { name: 'firstName', label: 'First Name', defaultValue: 'Dev' },
  { name: 'lastName', label: 'Last Name', defaultValue: 'User' },
  { name: 'title', label: 'Title', defaultValue: 'Engineer' },
  { name: 'department', label: 'Department', defaultValue: 'Engineering' },
  { name: 'phone', label: 'Phone', defaultValue: '' },
];

export function UsersPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const setResponse = useDevPlaygroundStore((s) => s.setResponse);
  const user = useAuthStore((s) => s.user);

  const handleList = async () => {
    setLoading('list');
    try {
      const result = await usersApi.list({ page: 1, limit: 10 });
      setResponse('users-list', result, 'success');
    } catch (err) {
      setResponse('users-list', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleGetMe = async () => {
    setLoading('getme');
    try {
      const result = await usersApi.getMe();
      setResponse('users-me', result, 'success');
    } catch (err) {
      setResponse('users-me', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleCreate = async (values: Record<string, string>) => {
    if (!user) return;
    setLoading('create');
    try {
      const result = await usersApi.create({
        userId: user.id,
        firstName: values.firstName,
        lastName: values.lastName,
        tenantId: user.tenantId,
        title: values.title,
        department: values.department,
        phone: values.phone || undefined,
      });
      setResponse('users-create', result, 'success');
    } catch (err) {
      setResponse('users-create', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleSuspend = async () => {
    if (!user) return;
    setLoading('suspend');
    try {
      const result = await usersApi.suspend(user.id);
      setResponse('users-suspend', result, 'success');
    } catch (err) {
      setResponse('users-suspend', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleActivate = async () => {
    if (!user) return;
    setLoading('activate');
    try {
      const result = await usersApi.activate(user.id);
      setResponse('users-activate', result, 'success');
    } catch (err) {
      setResponse('users-activate', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <DomainPanel title="Users" domain="users-me">
      <div className="flex flex-wrap gap-2 mb-3">
        <Button size="sm" variant="outline" onClick={handleList} loading={loading === 'list'}>
          List Users
        </Button>
        <Button size="sm" variant="outline" onClick={handleGetMe} loading={loading === 'getme'}>
          My Profile
        </Button>
        <Button size="sm" variant="outline" onClick={handleSuspend} loading={loading === 'suspend'}>
          Suspend Me
        </Button>
        <Button size="sm" variant="outline" onClick={handleActivate} loading={loading === 'activate'}>
          Activate Me
        </Button>
      </div>
      <div className="border-t border-border pt-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Create User Profile</p>
        <PrefillForm
          fields={createFields}
          onSubmit={handleCreate}
          submitLabel="Create Profile"
          loading={loading === 'create'}
        />
      </div>
    </DomainPanel>
  );
}
