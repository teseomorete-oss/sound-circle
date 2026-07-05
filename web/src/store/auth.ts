import { create } from 'zustand';
import { api, setAuthToken, getAuthToken, AuthUser } from '../api/client';

type Status = 'loading' | 'in' | 'out';

interface AuthState {
  status: Status;
  user: AuthUser | null;
  init: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, code?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  async init() {
    if (!getAuthToken()) { set({ status: 'out', user: null }); return; }
    try {
      const { user } = await api.me();
      set({ status: 'in', user });
    } catch {
      setAuthToken('');
      set({ status: 'out', user: null });
    }
  },

  async login(username, password) {
    const { token, user } = await api.login(username, password);
    setAuthToken(token);
    set({ status: 'in', user });
  },

  async signup(username, password, code) {
    const { token, user } = await api.signup(username, password, code);
    setAuthToken(token);
    set({ status: 'in', user });
  },

  async logout() {
    await api.logout();
    setAuthToken('');
    set({ status: 'out', user: null });
  },
}));

// If any request 401s, drop back to the login screen.
window.addEventListener('sc-unauthorized', () => useAuth.setState({ status: 'out', user: null }));
