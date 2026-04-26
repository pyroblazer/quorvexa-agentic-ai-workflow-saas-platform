import { QuorvexaClient } from './client';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeClient(token?: string) {
  return new QuorvexaClient({
    baseUrl: 'https://api.example.com/',
    getAccessToken: token ? () => token : undefined,
  });
}

function mockSuccess(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status,
    json: () => Promise.resolve(body),
  });
}

function mockError(message: string, status = 400) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ message }),
  });
}

beforeEach(() => mockFetch.mockReset());

describe('QuorvexaClient', () => {
  describe('constructor', () => {
    it('strips trailing slash from baseUrl', () => {
      const client = new QuorvexaClient({ baseUrl: 'https://api.example.com/' });
      mockSuccess({ accessToken: 'tok', refreshToken: 'ref' });
      client.auth.login('a@b.com', 'pass');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/auth/login',
        expect.any(Object),
      );
    });

    it('works without getAccessToken', () => {
      const client = new QuorvexaClient({ baseUrl: 'https://api.example.com' });
      mockSuccess({});
      client.auth.logout();
      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Authorization']).toBeUndefined();
    });
  });

  describe('request headers', () => {
    it('adds Authorization header when token is available', async () => {
      const client = makeClient('my-token');
      mockSuccess({ items: [], total: 0 });
      await client.workflows.list();
      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Authorization']).toBe('Bearer my-token');
    });

    it('omits Authorization when no token', async () => {
      const client = makeClient();
      mockSuccess({ items: [], total: 0 });
      await client.workflows.list();
      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Authorization']).toBeUndefined();
    });

    it('always sets Content-Type', async () => {
      const client = makeClient();
      mockSuccess({});
      await client.auth.logout();
      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Content-Type']).toBe('application/json');
    });

    it('throws with HTTP error message on failure', async () => {
      const client = makeClient();
      mockError('Email already registered', 409);
      await expect(
        client.auth.register({ email: 'x@x.com', password: 'p', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow('Email already registered');
    });

    it('throws generic message when no message in error body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });
      const client = makeClient();
      await expect(client.auth.logout()).rejects.toThrow('HTTP 500: /api/v1/auth/logout');
    });
  });

  describe('auth', () => {
    it('login sends POST with credentials', async () => {
      const client = makeClient();
      mockSuccess({ accessToken: 'tok', refreshToken: 'ref' });
      const result = await client.auth.login('user@example.com', 'password123');
      expect(result.accessToken).toBe('tok');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/auth/login');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toMatchObject({ email: 'user@example.com' });
    });

    it('register sends POST with registration data', async () => {
      const client = makeClient();
      mockSuccess({ accessToken: 'tok' });
      await client.auth.register({ email: 'new@example.com', password: 'pass', firstName: 'A', lastName: 'B' });
      const [, init] = mockFetch.mock.calls[0];
      expect(JSON.parse(init.body)).toMatchObject({ email: 'new@example.com', firstName: 'A' });
    });

    it('logout sends DELETE', async () => {
      const client = makeClient('tok');
      mockSuccess(undefined);
      await client.auth.logout();
      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('DELETE');
    });
  });

  describe('workflows', () => {
    it('list sends GET with pagination params', async () => {
      const client = makeClient('tok');
      mockSuccess({ items: [], total: 0 });
      await client.workflows.list({ page: 2, limit: 10 });
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('page=2');
      expect(url).toContain('limit=10');
    });

    it('list uses defaults when no params provided', async () => {
      const client = makeClient('tok');
      mockSuccess({ items: [], total: 0 });
      await client.workflows.list();
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('page=1');
      expect(url).toContain('limit=20');
    });

    it('get fetches workflow by id', async () => {
      const client = makeClient('tok');
      mockSuccess({ id: 'wf-1' });
      const _result = await client.workflows.get('wf-1');
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/workflows/wf-1');
    });

    it('create sends POST with workflow data', async () => {
      const client = makeClient('tok');
      mockSuccess({ id: 'wf-new' });
      await client.workflows.create({ name: 'My Workflow', description: 'desc' });
      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toMatchObject({ name: 'My Workflow' });
    });

    it('trigger sends POST with payload', async () => {
      const client = makeClient('tok');
      mockSuccess({ success: true });
      await client.workflows.trigger('wf-1', { data: 'value' });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/workflows/wf-1/trigger');
      expect(JSON.parse(init.body)).toMatchObject({ data: 'value' });
    });

    it('trigger uses empty object when no payload', async () => {
      const client = makeClient('tok');
      mockSuccess({ success: true });
      await client.workflows.trigger('wf-1');
      const [, init] = mockFetch.mock.calls[0];
      expect(JSON.parse(init.body)).toEqual({});
    });
  });

  describe('agents', () => {
    it('run sends POST with prompt and optional session/config', async () => {
      const client = makeClient('tok');
      mockSuccess({ output: 'result', sessionId: 'sess-1' });
      await client.agents.run('Hello agent', 'sess-1', { maxIterations: 5 });
      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body);
      expect(body.prompt).toBe('Hello agent');
      expect(body.session_id).toBe('sess-1');
      expect(body.config).toMatchObject({ maxIterations: 5 });
    });

    it('run uses empty config when none provided', async () => {
      const client = makeClient('tok');
      mockSuccess({ output: 'result', sessionId: 'sess-new' });
      await client.agents.run('Do something');
      const [, init] = mockFetch.mock.calls[0];
      expect(JSON.parse(init.body).config).toEqual({});
    });
  });
});
