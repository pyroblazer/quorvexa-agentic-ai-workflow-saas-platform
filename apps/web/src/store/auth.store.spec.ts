import { useAuthStore } from './auth.store';

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Zustand with persist uses sessionStorage — stub it
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    length: 0,
    key: () => null,
  };
})();
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

beforeEach(() => {
  mockFetch.mockReset();
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false, _hasHydrated: false });
});

describe('useAuthStore', () => {
  describe('initial state', () => {
    it('starts unauthenticated', () => {
      const { user, accessToken, isAuthenticated } = useAuthStore.getState();
      expect(user).toBeNull();
      expect(accessToken).toBeNull();
      expect(isAuthenticated).toBe(false);
    });

    it('starts with _hasHydrated false', () => {
      expect(useAuthStore.getState()._hasHydrated).toBe(false);
    });
  });

  describe('_hasHydrated', () => {
    it('can be set to true to signal rehydration complete', () => {
      useAuthStore.setState({ _hasHydrated: true });
      expect(useAuthStore.getState()._hasHydrated).toBe(true);
    });
  });

  describe('setTokens', () => {
    it('sets user, accessToken, and isAuthenticated', () => {
      const user = { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'member', tenantId: 't1' };
      useAuthStore.getState().setTokens('my-token', user);
      const state = useAuthStore.getState();
      expect(state.user).toBe(user);
      expect(state.accessToken).toBe('my-token');
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('login', () => {
    const user = { id: 'u1', email: 'test@example.com', firstName: 'T', lastName: 'U', role: 'member', tenantId: 't1' };

    it('calls /api/v1/auth/login with credentials and sets state on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'tok', user }),
      });

      await useAuthStore.getState().login('test@example.com', 'password');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('tok');
      expect(state.user?.email).toBe('test@example.com');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });

    it('throws error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid credentials' }),
      });

      await expect(useAuthStore.getState().login('x@x.com', 'wrong')).rejects.toThrow('Invalid credentials');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('throws generic error when no message in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(useAuthStore.getState().login('x@x.com', 'wrong')).rejects.toThrow('Login failed');
    });
  });

  describe('logout', () => {
    it('clears state regardless of fetch outcome', async () => {
      useAuthStore.setState({ accessToken: 'tok', isAuthenticated: true, _hasHydrated: true, user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'member', tenantId: 't1' } });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(null) });

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('clears state even when fetch fails', async () => {
      useAuthStore.setState({ accessToken: 'tok', isAuthenticated: true, _hasHydrated: true, user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'member', tenantId: 't1' } });
      mockFetch.mockRejectedValueOnce(new Error('network error'));

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('skips fetch when no access token', async () => {
      useAuthStore.setState({ accessToken: null, isAuthenticated: false });
      await useAuthStore.getState().logout();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
