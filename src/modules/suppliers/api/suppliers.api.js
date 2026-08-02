import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const suppliersApi = {
  list: (params) => api.get(endpoints.suppliers, { params }),
  listAll: () => api.get(endpoints.suppliers, { params: { all: 'true' } }),
  create: (data) => api.post(endpoints.suppliers, data),
  update: (id, data) => api.put(`${endpoints.suppliers}/${id}`, data),
  remove: (id) => api.delete(`${endpoints.suppliers}/${id}`),
  save: ({ id, data }) => (id ? suppliersApi.update(id, data) : suppliersApi.create(data)),
};
