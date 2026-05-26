import axios from 'axios';

const normalize = (value = '') => value.replace(/\/+$/, '');
const withApiSuffix = (value = '') => (/\/api$/i.test(value) ? value : `${value}/api`);
const isAuthRequest = (url = '') => {
  const normalizedUrl = String(url).replace(/^\/+/, '');
  return [
    'auth/login',
    'auth/register',
    'auth/forgot-password',
    'auth/reset-password',
  ].some((path) => normalizedUrl.includes(path));
};
const isVercelHosted = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('.vercel.app');
};

const envBase = normalize(import.meta.env.VITE_API_BASE_URL || '');
const baseURL = isVercelHosted() ? '/api' : (envBase ? withApiSuffix(envBase) : '/api');

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // Normalize request paths so baseURL yields '/api/<endpoint>' exactly once.
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
    const isAuthEndpoint = isAuthRequest(url);
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('mcad_token');
      localStorage.removeItem('mcad_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
