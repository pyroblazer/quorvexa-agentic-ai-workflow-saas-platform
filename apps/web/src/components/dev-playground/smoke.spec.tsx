import '@testing-library/jest-dom';

// Smoke test: verify every playground module parses without syntax errors.
// This catches issues like mixing || and ?? without parens that only
// surface at build time with the SWC compiler.

jest.mock('@quorvexa/ui', () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: string; size?: string }) => {
    const { loading: _l, variant: _v, size: _s, ...rest } = props;
    return <button {...rest} />;
  },
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Badge: (props: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) => {
    const { variant: _v, ...rest } = props;
    return <span {...rest} />;
  },
  Card: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  CardHeader: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  CardContent: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  CardFooter: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Spinner: () => <span data-testid="spinner" />,
}));

jest.mock('@/store/dev-playground.store', () => ({
  useDevPlaygroundStore: (sel: (s: Record<string, unknown>) => unknown) =>
    sel({ responses: {}, guideSteps: {}, guideActiveStep: null, setResponse: jest.fn(), setGuideStep: jest.fn(), setActiveStep: jest.fn(), resetGuide: jest.fn(), clearResponses: jest.fn() }),
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: (sel: (s: Record<string, unknown>) => unknown) =>
    sel({ user: { id: 'u-1', email: 'dev@test.com', tenantId: 't-1' }, isAuthenticated: true, login: jest.fn(), logout: jest.fn(), setTokens: jest.fn() }),
}));

jest.mock('@/lib/api', () => ({
  authApi: { register: jest.fn(), refresh: jest.fn(), logoutAll: jest.fn() },
  usersApi: { list: jest.fn(), getMe: jest.fn(), getById: jest.fn(), create: jest.fn(), updateMe: jest.fn(), updateById: jest.fn(), deleteById: jest.fn(), suspend: jest.fn(), activate: jest.fn() },
  preferencesApi: { get: jest.fn(), update: jest.fn(), reset: jest.fn() },
  workflowApi: { list: jest.fn(), get: jest.fn(), create: jest.fn(), update: jest.fn(), deleteById: jest.fn(), activate: jest.fn(), trigger: jest.fn(), events: jest.fn() },
  notificationsApi: { send: jest.fn(), list: jest.fn(), listMine: jest.fn(), getById: jest.fn(), update: jest.fn(), markRead: jest.fn(), retry: jest.fn(), deleteById: jest.fn() },
  templatesApi: { list: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn(), render: jest.fn(), deleteById: jest.fn() },
  agentApi: { run: jest.fn(), embed: jest.fn(), search: jest.fn() },
  toolsApi: { list: jest.fn() },
}));

describe('Dev playground modules parse correctly', () => {
  const modules = [
    () => import('./json-viewer'),
    () => import('./prefill-form'),
    () => import('./domain-panel'),
    () => import('./simulation-step'),
    () => import('./simulation-guide'),
    () => import('./playground-tabs'),
    () => import('./auth-panel'),
    () => import('./users-panel'),
    () => import('./workflows-panel'),
    () => import('./notifications-panel'),
    () => import('./templates-panel'),
    () => import('./agents-panel'),
    () => import('./preferences-panel'),
  ];

  const names = [
    'json-viewer', 'prefill-form', 'domain-panel', 'simulation-step', 'simulation-guide',
    'playground-tabs', 'auth-panel', 'users-panel', 'workflows-panel', 'notifications-panel',
    'templates-panel', 'agents-panel', 'preferences-panel',
  ];

  modules.forEach((importFn, i) => {
    it(`${names[i]} imports without error`, async () => {
      await expect(importFn()).resolves.toBeDefined();
    });
  });
});
