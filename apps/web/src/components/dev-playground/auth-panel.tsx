'use client';

import { Button } from '@quorvexa/ui';
import { useState } from 'react';

import { DomainPanel } from './domain-panel';
import { PrefillForm, type FormField } from './prefill-form';

import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useDevPlaygroundStore } from '@/store/dev-playground.store';


const loginFields: FormField[] = [
  { name: 'email', label: 'Email', type: 'email', defaultValue: 'admin@quorvexa.dev' },
  { name: 'password', label: 'Password', type: 'password', defaultValue: 'Qu0rv3xa!Admin' },
];

const registerFields: FormField[] = [
  { name: 'email', label: 'Email', type: 'email', defaultValue: 'dev@quorvexa.io' },
  { name: 'password', label: 'Password', type: 'password', defaultValue: 'DevPass123!' },
  { name: 'firstName', label: 'First Name', type: 'text', defaultValue: 'Dev' },
  { name: 'lastName', label: 'Last Name', type: 'text', defaultValue: 'User' },
];

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

export function AuthPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const setResponse = useDevPlaygroundStore((s) => s.setResponse);
  const loginStore = useAuthStore((s) => s.login);

  const handleLogin = async (values: Record<string, string>) => {
    setLoading('login');
    try {
      await loginStore(values.email, values.password);
      const user = useAuthStore.getState().user;
      setResponse('auth-login', { success: true, user }, 'success');
    } catch (err) {
      setResponse('auth-login', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleQuickLogin = async () => {
    setLoading('login');
    try {
      await loginStore('admin@quorvexa.dev', 'Qu0rv3xa!Admin');
      const user = useAuthStore.getState().user;
      setResponse('auth-login', { success: true, user }, 'success');
    } catch (err) {
      setResponse('auth-login', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleRegister = async (values: Record<string, string>) => {
    setLoading('register');
    try {
      const result = await authApi.register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      });
      setResponse('auth-register', result, 'success');
    } catch (err) {
      setResponse('auth-register', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleQuickRegister = async () => {
    setLoading('register');
    const suffix = randomSuffix();
    try {
      const result = await authApi.register({
        email: `test-${suffix}@quorvexa.io`,
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: `User${suffix}`,
      });
      setResponse('auth-register', result, 'success');
    } catch (err) {
      setResponse('auth-register', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleRefresh = async () => {
    setLoading('refresh');
    try {
      const result = await authApi.refresh();
      setResponse('auth-refresh', result, 'success');
    } catch (err) {
      setResponse('auth-refresh', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleLogoutAll = async () => {
    setLoading('logout-all');
    try {
      await authApi.logoutAll();
      setResponse('auth-logout-all', { success: true }, 'success');
    } catch (err) {
      setResponse('auth-logout-all', { error: err instanceof Error ? err.message : String(err) }, 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <DomainPanel title="Auth — Login" domain="auth-login">
        <div className="flex flex-wrap gap-2 mb-3">
          <Button size="sm" onClick={handleQuickLogin} loading={loading === 'login'}>
            Quick Login (Admin)
          </Button>
        </div>
        <PrefillForm
          fields={loginFields}
          onSubmit={handleLogin}
          submitLabel="Login"
          loading={loading === 'login'}
        />
      </DomainPanel>

      <DomainPanel title="Auth — Register" domain="auth-register">
        <div className="flex flex-wrap gap-2 mb-3">
          <Button size="sm" variant="outline" onClick={handleRefresh} loading={loading === 'refresh'}>
            Refresh Token
          </Button>
          <Button size="sm" variant="outline" onClick={handleQuickRegister} loading={loading === 'register'}>
            Generate Test User
          </Button>
          <Button size="sm" variant="destructive" onClick={handleLogoutAll} loading={loading === 'logout-all'}>
            Logout All Sessions
          </Button>
        </div>
        <PrefillForm
          fields={registerFields}
          onSubmit={handleRegister}
          submitLabel="Register User"
          loading={loading === 'register'}
        />
      </DomainPanel>
    </div>
  );
}
