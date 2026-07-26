import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const categoriesApi = {
  list: (params) => api.get(endpoints.categories, { params }),
  listAll: () => api.get(endpoints.categories, { params: { all: 'true' } }),
  create: (data) => api.post(endpoints.categories, data),
  update: (id, data) => api.put(`${endpoints.categories}/${id}`, data),
  remove: (id) => api.delete(`${endpoints.categories}/${id}`),
  save: ({ id, data }) => (id ? categoriesApi.update(id, data) : categoriesApi.create(data)),
};
