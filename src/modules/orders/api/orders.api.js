import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const ordersApi = {
  list: (params) => api.get(endpoints.orders, { params }),
  getById: (id) => api.get(`${endpoints.orders}/${id}`),
  update: (id, data) => api.put(`${endpoints.orders}/${id}`, data),
  updateStatus: (id, status) => api.patch(`${endpoints.orders}/${id}/status`, { status }),
  updateShippingLabel: (id, shipping_label) =>
    api.patch(`${endpoints.orders}/${id}/shipping-label`, { shipping_label }),
  generateShippingLabel: (id) => api.post(`${endpoints.orders}/${id}/shipping-label/generate`),
  syncSabil: (id, data = {}) => api.post(`${endpoints.orders}/${id}/sabil/sync`, data),
  refreshSabil: (id) => api.post(`${endpoints.orders}/${id}/sabil/refresh`),
  refreshPendingSabil: () =>
    api.post(`${endpoints.orders}/sabil/refresh-pending`, {}, { timeout: 120000 }),
  remove: (id) => api.delete(`${endpoints.orders}/${id}`),
};
