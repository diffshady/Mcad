import axios from 'axios';

const normalize = (value = '') => value.replace(/\/+$/, '');
const withApiSuffix = (value = '') => (/\/api$/i.test(value) ? value : `${value}/api`);
const isVercelHosted = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('.vercel.app');
};
const usesVercelProxy = isVercelHosted();

const envBase = normalize(import.meta.env.VITE_API_BASE_URL || '');
const baseURL = usesVercelProxy ? '/api/proxy' : (envBase ? withApiSuffix(envBase) : '/api');

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  let requestPath = '';

  // Normalize request paths so baseURL yields '/api/<endpoint>' exactly once.
  if (typeof config.url === 'string') {
    if (config.url.startsWith('/api/')) {
      requestPath = config.url.slice('/api/'.length);
    } else if (config.url.startsWith('/')) {
      requestPath = config.url.slice(1);
    } else {
      requestPath = config.url;
    }
  }

  config.__mcadOriginalUrl = requestPath;

  if (usesVercelProxy) {
    config.url = '';
    config.params = { ...(config.params || {}), path: requestPath };
  } else {
    config.url = requestPath;
  }

  const token = localStorage.getItem('mcad_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.__mcadOriginalUrl || err.config?.url || '';
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
