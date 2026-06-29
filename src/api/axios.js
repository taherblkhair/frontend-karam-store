import axios from 'axios';
import { createApiError } from '../utils/apiMessage.js';

const api = axios.create({
  baseURL: '/api',
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

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(
      createApiError({
        message: payload?.message ?? error.message ?? '',
        errors: payload?.errors,
        statusCode: payload?.statusCode ?? error.response?.status,
      })
    );
  }
);

export default api;
