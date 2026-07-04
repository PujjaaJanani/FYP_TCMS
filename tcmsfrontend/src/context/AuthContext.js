import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { setAuthHandlers } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { id, name, email, userType, role? }
  const [loading, setLoading] = useState(true);  // true while we check /me on first load
  const navigate = useNavigate();

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    localStorage.removeItem('role');
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/logout');
    } catch (e) {
      // even if the API call fails, still clear local state
    }
    clearSession();
    navigate('/login');
  }, [clearSession, navigate]);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/api/me');
      setUser(res.data.data); // matches your AuthController@me response shape
    } catch (e) {
      // interceptor already handles 401 redirect; just clear local state
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/api/login', { email, password }, { skipAuthHandlers: true });
    const { token, user: userData } = res.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Wire the axios interceptor callbacks to real navigation + state clearing
  useEffect(() => {
    setAuthHandlers({
      onUnauthorized: () => {
        clearSession();
        navigate('/login');
      },
      onForbidden: () => {
        navigate('/unauthorized');
      },
    });
  }, [clearSession, navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
