import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('scm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('scm_token') || null);
  const [loading, setLoading] = useState(false);

  // Check URL token bypass (for TV kiosk)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tvToken = params.get('token');

    if (tvToken === 'shed2_live_display') {
      api.get(`/auth/tv-bypass?token=shed2_live_display`)
        .then(res => {
          setToken(res.data.token);
          setUser(res.data.user);
          localStorage.setItem('scm_token', res.data.token);
          localStorage.setItem('scm_user', JSON.stringify(res.data.user));
        })
        .catch(err => console.error('[TV Bypass Failed]', err));
    }
  }, []);

  const login = async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('scm_token', res.data.token);
    localStorage.setItem('scm_user', JSON.stringify(res.data.user));
    return res.data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('scm_token');
    localStorage.removeItem('scm_user');
  };

  const switchRole = async (targetRole, targetShift = 'I') => {
    try {
      if (targetRole === 'admin') {
        await login({ username: 'admin', password: '123' });
      } else if (targetRole === 'supervisor') {
        const usernameMap = { 'I': 'sup_shift1', 'II': 'sup_shift2', 'III': 'sup_shift3' };
        await login({ username: usernameMap[targetShift] || 'sup_shift1', password: '123' });
      } else if (targetRole === 'tv_display') {
        const res = await api.get('/auth/tv-bypass?token=shed2_live_display');
        setToken(res.data.token);
        setUser(res.data.user);
        localStorage.setItem('scm_token', res.data.token);
        localStorage.setItem('scm_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.error('[Switch Role Error]', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
