import axios from 'axios';

const baseURL = '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // Normalize request paths so baseURL '/api' yields '/api/<endpoint>' exactly once.
  if (typeof config.url === 'string') {
    if (config.url.startsWith('/api/')) {
      config.url = config.url.slice('/api/'.length);
    } else if (config.url.startsWith('/')) {
      config.url = config.url.slice(1);
    }
  }
  const token = localStorage.getItem('mcad_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/forgot-password') || url.includes('/auth/reset-password');
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('mcad_token');
      localStorage.removeItem('mcad_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
