import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const bannersApi = {
  list: (params) => api.get(endpoints.banners, { params }),
  create: (data) => api.post(endpoints.banners, data),
  update: (id, data) => api.put(`${endpoints.banners}/${id}`, data),
  remove: (id) => api.delete(`${endpoints.banners}/${id}`),
  save: ({ id, data }) => (id ? bannersApi.update(id, data) : bannersApi.create(data)),
};
