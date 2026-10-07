import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const brandsApi = {
  list: () => api.get(endpoints.brands),
  create: (data) => api.post(endpoints.brands, { ...data, strict: true }),
  update: (id, data) => api.put(`${endpoints.brands}/${id}`, data),
  remove: (id) => api.delete(`${endpoints.brands}/${id}`),
  save: ({ id, data }) => (id ? brandsApi.update(id, data) : brandsApi.create(data)),
};
