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
  (response) => {
    const data = response.data;

    // Production misconfig (Passenger default page, HTML, plain text, etc.)
    if (typeof data === 'string' || data == null || typeof data !== 'object') {
      return Promise.reject(
        createApiError({
          message:
            'الخادم لا يُرجع استجابة API صحيحة. تأكد من تشغيل تطبيق Express (وليس صفحة Passenger الافتراضية).',
          code: 'INVALID_API_RESPONSE',
          statusCode: response.status || 502,
        })
      );
    }

    // Expected envelope: { success, message, data }
    if (typeof data.success !== 'boolean') {
      return Promise.reject(
        createApiError({
          message:
            'صيغة استجابة الـ API غير متوقعة. تحقق من أن api.karamstore.ly يشغّل مشروع الـ Backend.',
          code: 'INVALID_API_RESPONSE',
          statusCode: response.status || 502,
        })
      );
    }

    return data;
  },
  (error) => {
    const payload = error.response?.data;
    const statusCode =
      (typeof payload === 'object' && payload?.statusCode) ||
      error.response?.status ||
      null;
    const code = (typeof payload === 'object' && payload?.code) || null;
    const url = error.config?.url || '';
    const looksLikeDefaultHostPage =
      typeof payload === 'string' && /it works|NodeJS/i.test(payload);
    const isAuthAttempt =
      url.includes('/auth/login') || url.includes('/auth/register');

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

    if (looksLikeDefaultHostPage || typeof payload === 'string') {
      return Promise.reject(
        createApiError({
          message:
            'الخادم لا يشغّل الـ API (تم استلام صفحة افتراضية بدل JSON). راجع إعدادات الاستضافة / Passenger.',
          code: 'INVALID_API_RESPONSE',
          statusCode: statusCode || 502,
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
