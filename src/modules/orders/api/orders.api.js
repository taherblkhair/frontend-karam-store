import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';
import { API_BASE_URL } from '@core/api/config.js';
import { createApiError, NETWORK_ERROR_MESSAGE } from '@shared/utils/apiMessage.js';

export const ordersApi = {
  list: (params) => api.get(endpoints.orders, { params }),
  getById: (id) => api.get(`${endpoints.orders}/${id}`),
  update: (id, data) => api.put(`${endpoints.orders}/${id}`, data),
  updateStatus: (id, status, details = {}) =>
    api.patch(`${endpoints.orders}/${id}/status`, { status, ...details }),
  reviewPayment: (id, data) => api.patch(`${endpoints.orders}/${id}/payment-proof`, data),
  /** Private receipt file (Blob) — fetched with the staff token, like uploads (axios expects JSON). */
  getPaymentReceipt: async (id) => {
    const token = localStorage.getItem('token');
    let res;
    try {
      res = await fetch(`${API_BASE_URL}${endpoints.orders}/${id}/payment-proof/receipt`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
    } catch {
      throw createApiError({ message: NETWORK_ERROR_MESSAGE, code: 'NETWORK_ERROR' });
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw createApiError({ message: data.message || 'تعذر تحميل الإيصال', statusCode: res.status });
    }
    return res.blob();
  },
  addNote: (id, body) => api.post(`${endpoints.orders}/${id}/notes`, { body }),
  deleteNote: (id, noteId) => api.delete(`${endpoints.orders}/${id}/notes/${noteId}`),
  updateItemsFulfillment: (id, data) =>
    api.post(`${endpoints.orders}/${id}/items/fulfillment`, data),
  updateShippingLabel: (id, shipping_label) =>
    api.patch(`${endpoints.orders}/${id}/shipping-label`, { shipping_label }),
  generateShippingLabel: (id) => api.post(`${endpoints.orders}/${id}/shipping-label/generate`),
  syncSabil: (id, data = {}) => api.post(`${endpoints.orders}/${id}/sabil/sync`, data),
  refreshSabil: (id) => api.post(`${endpoints.orders}/${id}/sabil/refresh`),
  refreshPendingSabil: () =>
    api.post(`${endpoints.orders}/sabil/refresh-pending`, {}, { timeout: 120000 }),
  remove: (id) => api.delete(`${endpoints.orders}/${id}`),
};
