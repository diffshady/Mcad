import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('mcad_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mcad_token');
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('mcad_user', JSON.stringify(res.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('mcad_token', data.token);
    localStorage.setItem('mcad_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    if (data.token) {
      localStorage.setItem('mcad_token', data.token);
      localStorage.setItem('mcad_user', JSON.stringify(data.user));
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('mcad_token');
    localStorage.removeItem('mcad_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isBarangayAdmin = user?.role === 'barangay_admin';
  const isImam = user?.role === 'imam';
  const isLeader = user?.role === 'leader';
  const isViewer = user?.role === 'viewer';
  const canManage = ['admin', 'barangay_admin', 'imam', 'leader'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, isBarangayAdmin, isImam, isLeader, isViewer, canManage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
