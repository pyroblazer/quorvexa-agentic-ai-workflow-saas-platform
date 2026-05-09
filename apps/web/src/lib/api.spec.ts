import {
  authApi,
  agentApi,
  notificationsApi,
  preferencesApi,
  templatesApi,
  toolsApi,
  usersApi,
  workflowApi,
} from './api';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockSuccess(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

function mockFailure(message: string, status = 400) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ message }),
  });
}

beforeEach(() => mockFetch.mockReset());

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

describe('authApi', () => {
  describe('register', () => {
    it('sends POST with registration data', async () => {
      mockSuccess({ id: 'u-1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'member', tenantId: 't-1' });
      const result = await authApi.register({ email: 'a@b.com', password: 'Pass123!', firstName: 'A', lastName: 'B' });
      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('POST');
      expect(result.email).toBe('a@b.com');
    });
  });

  describe('refresh', () => {
    it('sends POST to refresh endpoint', async () => {
      mockSuccess({ accessToken: 'new-token' });
      const result = await authApi.refresh();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/auth/refresh');
      expect(init.method).toBe('POST');
      expect(result.accessToken).toBe('new-token');
    });
  });

  describe('logoutAll', () => {
    it('sends DELETE to sessions endpoint', async () => {
      mockSuccess(undefined);
      await authApi.logoutAll();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/auth/sessions');
      expect(init.method).toBe('DELETE');
    });
  });
});

// ---------------------------------------------------------------------------
// Users API
// ---------------------------------------------------------------------------

describe('usersApi', () => {
  describe('list', () => {
    it('fetches users with pagination and search', async () => {
      mockSuccess({ items: [], total: 0, page: 1, limit: 20, pages: 0 });
      await usersApi.list({ page: 2, search: 'test' });
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('page=2');
      expect(url).toContain('search=test');
    });
  });

  describe('getMe', () => {
    it('fetches current user profile', async () => {
      mockSuccess({ id: 'p-1', userId: 'u-1', firstName: 'Me' });
      const result = await usersApi.getMe();
      expect(result.id).toBe('p-1');
    });
  });

  describe('getById', () => {
    it('fetches user by id', async () => {
      mockSuccess({ id: 'p-2', userId: 'u-2' });
      const result = await usersApi.getById('u-2');
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/users/u-2');
      expect(result.id).toBe('p-2');
    });
  });

  describe('create', () => {
    it('sends POST to create profile', async () => {
      mockSuccess({ id: 'p-3', userId: 'u-3', firstName: 'New' });
      const result = await usersApi.create({ userId: 'u-3', firstName: 'New', lastName: 'User', tenantId: 't-1' });
      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('POST');
      expect(result.firstName).toBe('New');
    });
  });

  describe('updateMe', () => {
    it('sends PATCH to update own profile', async () => {
      mockSuccess({ id: 'p-1', firstName: 'Updated' });
      await usersApi.updateMe({ firstName: 'Updated' });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/users/me');
      expect(init.method).toBe('PATCH');
    });
  });

  describe('updateById', () => {
    it('sends PATCH to update user by id', async () => {
      mockSuccess({ id: 'p-2', firstName: 'Changed' });
      await usersApi.updateById('u-2', { firstName: 'Changed' });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/users/u-2');
      expect(init.method).toBe('PATCH');
    });
  });

  describe('deleteById', () => {
    it('sends DELETE for user', async () => {
      mockSuccess(undefined);
      await usersApi.deleteById('u-2');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/users/u-2');
      expect(init.method).toBe('DELETE');
    });
  });

  describe('suspend', () => {
    it('sends POST to suspend endpoint', async () => {
      mockSuccess({ id: 'p-1', status: 'suspended' });
      await usersApi.suspend('u-1');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/users/u-1/suspend');
      expect(init.method).toBe('POST');
    });
  });

  describe('activate', () => {
    it('sends POST to activate endpoint', async () => {
      mockSuccess({ id: 'p-1', status: 'active' });
      await usersApi.activate('u-1');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/users/u-1/activate');
      expect(init.method).toBe('POST');
    });
  });
});

// ---------------------------------------------------------------------------
// Preferences API
// ---------------------------------------------------------------------------

describe('preferencesApi', () => {
  describe('get', () => {
    it('fetches current preferences', async () => {
      mockSuccess({ id: 'pref-1', theme: 'dark' });
      const result = await preferencesApi.get();
      expect(result.theme).toBe('dark');
    });
  });

  describe('update', () => {
    it('sends PATCH with preference data', async () => {
      mockSuccess({ id: 'pref-1', theme: 'light' });
      await preferencesApi.update({ theme: 'light' });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/preferences');
      expect(init.method).toBe('PATCH');
    });
  });

  describe('reset', () => {
    it('sends DELETE to reset preferences', async () => {
      mockSuccess({ id: 'pref-1', theme: 'system' });
      await preferencesApi.reset();
      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('DELETE');
    });
  });
});

// ---------------------------------------------------------------------------
// Workflows API
// ---------------------------------------------------------------------------

describe('workflowApi', () => {
  describe('list', () => {
    it('fetches workflows with default pagination', async () => {
      mockSuccess({ items: [], total: 0, page: 1, limit: 20, pages: 0 });
      const result = await workflowApi.list({});
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.any(Object),
      );
      expect(result.items).toEqual([]);
    });

    it('uses provided page and limit', async () => {
      mockSuccess({ items: [], total: 0, page: 2, limit: 10, pages: 5 });
      await workflowApi.list({ page: 2, limit: 10 });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2&limit=10'),
        expect.any(Object),
      );
    });

    it('throws on error response', async () => {
      mockFailure('Unauthorized', 401);
      await expect(workflowApi.list({})).rejects.toThrow('Unauthorized');
    });
  });

  describe('get', () => {
    it('fetches single workflow by id', async () => {
      const wf = { id: 'wf-1', name: 'Test', status: 'active', lastRunAt: null, runCount: 0, createdAt: '' };
      mockSuccess(wf);
      const result = await workflowApi.get('wf-1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/workflows/wf-1'),
        expect.any(Object),
      );
      expect(result.id).toBe('wf-1');
    });
  });

  describe('create', () => {
    it('sends POST with name and description', async () => {
      const created = { id: 'wf-new', name: 'New', status: 'draft', lastRunAt: null, runCount: 0, createdAt: '' };
      mockSuccess(created);
      await workflowApi.create({ name: 'New', description: 'Desc' });
      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toMatchObject({ name: 'New', description: 'Desc' });
    });
  });

  describe('update', () => {
    it('sends PATCH to update workflow', async () => {
      mockSuccess({ id: 'wf-1', name: 'Updated' });
      await workflowApi.update('wf-1', { name: 'Updated' });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/workflows/wf-1');
      expect(init.method).toBe('PATCH');
    });
  });

  describe('deleteById', () => {
    it('sends DELETE for workflow', async () => {
      mockSuccess(undefined);
      await workflowApi.deleteById('wf-1');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/workflows/wf-1');
      expect(init.method).toBe('DELETE');
    });
  });

  describe('activate', () => {
    it('sends POST to activate endpoint', async () => {
      mockSuccess({ id: 'wf-1', status: 'active' });
      await workflowApi.activate('wf-1');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/workflows/wf-1/activate');
      expect(init.method).toBe('POST');
    });
  });

  describe('trigger', () => {
    it('sends POST with payload to trigger endpoint', async () => {
      mockSuccess({ success: true });
      await workflowApi.trigger('wf-1', { key: 'val' });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/workflows/wf-1/trigger');
      expect(JSON.parse(init.body)).toMatchObject({ key: 'val' });
    });

    it('throws when trigger fails', async () => {
      mockFailure('Workflow not active', 403);
      await expect(workflowApi.trigger('wf-1', {})).rejects.toThrow('Workflow not active');
    });
  });

  describe('events', () => {
    it('returns SSE URL for workflow', () => {
      const url = workflowApi.events('wf-1');
      expect(url).toContain('/workflows/wf-1/events');
    });
  });

  describe('fetchJson error handling', () => {
    it('uses generic HTTP message when no message field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });
      await expect(workflowApi.list({})).rejects.toThrow('HTTP 500');
    });
  });
});

// ---------------------------------------------------------------------------
// Notifications API
// ---------------------------------------------------------------------------

describe('notificationsApi', () => {
  describe('send', () => {
    it('sends POST with notification data', async () => {
      mockSuccess({ id: 'n-1', subject: 'Test', status: 'pending' });
      const result = await notificationsApi.send({
        userId: 'u-1', channel: 'in_app', subject: 'Test', body: 'Hello', recipient: 'u-1',
      });
      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('POST');
      expect(result.id).toBe('n-1');
    });
  });

  describe('list', () => {
    it('fetches notifications with filters', async () => {
      mockSuccess({ items: [], total: 0, page: 1, limit: 20, pages: 0 });
      await notificationsApi.list({ status: 'pending', channel: 'email' });
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('status=pending');
      expect(url).toContain('channel=email');
    });
  });

  describe('listMine', () => {
    it('fetches current user notifications', async () => {
      mockSuccess({ items: [], total: 0, page: 1, limit: 20, pages: 0 });
      await notificationsApi.listMine({ page: 1 });
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/notifications/me');
    });
  });

  describe('markRead', () => {
    it('sends POST to mark notification as read', async () => {
      mockSuccess({ id: 'n-1', status: 'read' });
      await notificationsApi.markRead('n-1');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/notifications/n-1/read');
      expect(init.method).toBe('POST');
    });
  });

  describe('retry', () => {
    it('sends POST to retry failed notification', async () => {
      mockSuccess({ id: 'n-1', status: 'pending' });
      await notificationsApi.retry('n-1');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/notifications/n-1/retry');
      expect(init.method).toBe('POST');
    });
  });

  describe('deleteById', () => {
    it('sends DELETE for notification', async () => {
      mockSuccess(undefined);
      await notificationsApi.deleteById('n-1');
      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('DELETE');
    });
  });
});

// ---------------------------------------------------------------------------
// Templates API
// ---------------------------------------------------------------------------

describe('templatesApi', () => {
  describe('list', () => {
    it('fetches templates with pagination', async () => {
      mockSuccess({ items: [], total: 0, page: 1, limit: 20, pages: 0 });
      await templatesApi.list({ page: 1 });
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/notifications/templates');
    });
  });

  describe('create', () => {
    it('sends POST with template data', async () => {
      mockSuccess({ id: 't-1', name: 'Welcome', slug: 'welcome' });
      const result = await templatesApi.create({
        name: 'Welcome', slug: 'welcome', subject: 'Welcome!', bodyTemplate: 'Hi {{name}}', channel: 'email',
      });
      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('POST');
      expect(result.slug).toBe('welcome');
    });
  });

  describe('render', () => {
    it('sends POST to render template with variables', async () => {
      mockSuccess({ subject: 'Welcome John!', body: 'Hi John' });
      await templatesApi.render('t-1', { name: 'John' });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/templates/t-1/render');
      expect(JSON.parse(init.body)).toMatchObject({ variables: { name: 'John' } });
    });
  });

  describe('deleteById', () => {
    it('sends DELETE for template', async () => {
      mockSuccess(undefined);
      await templatesApi.deleteById('t-1');
      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('DELETE');
    });
  });
});

// ---------------------------------------------------------------------------
// Agents API
// ---------------------------------------------------------------------------

describe('agentApi', () => {
  describe('run', () => {
    it('sends POST with prompt to agents endpoint', async () => {
      mockSuccess({ output: 'Agent response', sessionId: 'sess-1' });
      const result = await agentApi.run({ prompt: 'Hello' });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/agents/run');
      expect(init.method).toBe('POST');
      expect(result.output).toBe('Agent response');
    });

    it('passes sessionId as session_id', async () => {
      mockSuccess({ output: 'ok', sessionId: 'my-sess' });
      await agentApi.run({ prompt: 'test', sessionId: 'my-sess' });
      const [, init] = mockFetch.mock.calls[0];
      expect(JSON.parse(init.body).session_id).toBe('my-sess');
    });

    it('defaults to empty config', async () => {
      mockSuccess({ output: 'ok', sessionId: 's' });
      await agentApi.run({ prompt: 'test' });
      const [, init] = mockFetch.mock.calls[0];
      expect(JSON.parse(init.body).config).toEqual({});
    });

    it('passes custom config', async () => {
      mockSuccess({ output: 'ok', sessionId: 's' });
      await agentApi.run({ prompt: 'test', config: { maxIterations: 3 } });
      const [, init] = mockFetch.mock.calls[0];
      expect(JSON.parse(init.body).config).toMatchObject({ maxIterations: 3 });
    });

    it('throws on agent error', async () => {
      mockFailure('LLM unavailable', 503);
      await expect(agentApi.run({ prompt: 'test' })).rejects.toThrow('LLM unavailable');
    });
  });

  describe('embed', () => {
    it('sends POST with content to embed endpoint', async () => {
      mockSuccess({ success: true, pointId: 'pt-1' });
      const result = await agentApi.embed({ content: 'Hello world' });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/agents/embed');
      expect(init.method).toBe('POST');
      expect(result.success).toBe(true);
    });
  });

  describe('search', () => {
    it('sends POST with query to search endpoint', async () => {
      mockSuccess({ results: [{ id: 'pt-1', content: 'Hello', score: 0.95 }] });
      const result = await agentApi.search({ query: 'hello' });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/agents/search');
      expect(init.method).toBe('POST');
      expect(result.results).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
// Tools API
// ---------------------------------------------------------------------------

describe('toolsApi', () => {
  describe('list', () => {
    it('fetches available tools', async () => {
      mockSuccess([{ name: 'search_web', description: 'Search the web' }]);
      const result = await toolsApi.list();
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/tools');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('search_web');
    });
  });
});
