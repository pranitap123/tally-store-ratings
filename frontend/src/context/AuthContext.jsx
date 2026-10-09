import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthenticatedHandler } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    setUnauthenticatedHandler(() => setUser(null));
    api
      .get('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, []);

  const login = useCallback(async (values) => {
    const r = await api.post('/auth/login', values);
    setUser(r.data);
    return r.data;
  }, []);

  const signup = useCallback(async (values) => {
    const r = await api.post('/auth/signup', values);
    setUser(r.data);
    return r.data;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, booting, login, signup, logout }), [user, booting, login, signup, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
