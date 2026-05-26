import axios from 'axios';

const normalize = (value = '') => value.replace(/\/+$/, '');
const withApiSuffix = (value = '') => (/\/api$/i.test(value) ? value : `${value}/api`);

const envBase = normalize(import.meta.env.VITE_API_BASE_URL || '');
const baseURL = envBase ? withApiSuffix(envBase) : '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
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
