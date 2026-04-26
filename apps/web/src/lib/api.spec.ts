import { workflowApi, agentApi } from './api';

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
});
