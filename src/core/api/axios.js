import axios from 'axios';
import { createApiError, NETWORK_ERROR_MESSAGE } from '@shared/utils/apiMessage.js';
import { API_BASE_URL } from './config.js';

const SESSION_CODES = new Set(['AUTH_REQUIRED', 'INVALID_TOKEN', 'TOKEN_EXPIRED']);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const payload = error.response?.data;
    const statusCode = payload?.statusCode ?? error.response?.status ?? null;
    const code = payload?.code ?? null;
    const url = error.config?.url || '';

    const isAuthAttempt =
      url.includes('/auth/login') || url.includes('/auth/register');

    // Clear session only for expired/invalid tokens — not wrong login credentials
    const shouldClearSession =
      statusCode === 401 &&
      !isAuthAttempt &&
      (SESSION_CODES.has(code) || !code);

    if (shouldClearSession) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    if (!error.response) {
      return Promise.reject(
        createApiError({
          message: NETWORK_ERROR_MESSAGE,
          code: 'NETWORK_ERROR',
        })
      );
    }

    return Promise.reject(
      createApiError({
        message: payload?.message || '',
        errors: payload?.errors,
        statusCode,
        code,
      })
    );
  }
);

export default api;
