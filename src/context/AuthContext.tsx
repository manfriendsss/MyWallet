import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError, SESSION_EXPIRED_EVENT, authApi, type AuthUser } from '../services/api';
import { clearLocalWalletData } from '../services/storage';

type AuthStatus = 'loading' | 'signedOut' | 'mustChangePassword' | 'signedIn' | 'offline';

interface AuthContextType {
  status: AuthStatus;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const statusFor = (user: AuthUser | null): AuthStatus =>
  !user ? 'signedOut' : user.mustChangePassword ? 'mustChangePassword' : 'signedIn';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const check = useCallback(async () => {
    setStatus('loading');
    try {
      const { user } = await authApi.me();
      setUser(user);
      setStatus(statusFor(user));
    } catch (err) {
      setUser(null);
      // No network: let the app open on the data cached in this browser instead of locking the user out
      setStatus(err instanceof ApiError && err.status === 0 ? 'offline' : 'signedOut');
    }
  }, []);

  useEffect(() => {
    void check();
    const onExpired = () => {
      setUser(null);
      setStatus('signedOut');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [check]);

  const login = async (username: string, password: string) => {
    const { user } = await authApi.login(username, password);
    setUser(user);
    setStatus(statusFor(user));
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      // Nothing private stays behind on this device
      clearLocalWalletData();
      setUser(null);
      setStatus('signedOut');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const { user } = await authApi.changePassword(currentPassword, newPassword);
    setUser(user);
    setStatus(statusFor(user));
  };

  return (
    <AuthContext.Provider value={{ status, user, login, logout, changePassword, retry: () => void check() }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
