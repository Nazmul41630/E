import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, peekBootstrap } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => peekBootstrap()?.admin ?? null);

  useEffect(() => {
    const onUnauthorized = () => setAdmin(null);
    window.addEventListener('cakehaus:unauthorized', onUnauthorized);
    return () => window.removeEventListener('cakehaus:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { username, password } });
    setAdmin(data.admin);
    return data.admin;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setAdmin(null);
    }
  }, []);

  const changePassword = useCallback(async (current, next) => {
    await api('/auth/password', { method: 'POST', body: { current, next } });
  }, []);

  const value = useMemo(
    () => ({ admin, isAdmin: Boolean(admin), login, logout, changePassword }),
    [admin, login, logout, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
