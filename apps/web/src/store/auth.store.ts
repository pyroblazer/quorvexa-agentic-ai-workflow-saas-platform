import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      login: async (email: string, password: string) => {
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });

        if (!response.ok) {
          let message = 'Login failed';
          try {
            const error = await response.json() as { message?: string };
            message = error.message ?? message;
          } catch {
            // upstream returned non-JSON (e.g., 502 from gateway)
          }
          throw new Error(message);
        }

        const data = await response.json() as { accessToken: string; user: User };
        set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true });
      },

      logout: async () => {
        const { accessToken } = get();
        if (accessToken) {
          await fetch('/api/v1/auth/logout', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
            credentials: 'include',
          }).catch(() => {});
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      setTokens: (accessToken: string, user: User) => {
        set({ accessToken, user, isAuthenticated: true });
      },
    }),
    {
      name: 'quorvexa-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
    },
  ),
);
