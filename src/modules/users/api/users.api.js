import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const usersApi = {
  list: (params) => api.get(endpoints.users, { params }),
  get: (id) => api.get(`${endpoints.users}/${id}`),
  roles: () => api.get(`${endpoints.users}/roles`),
  create: (data) => api.post(endpoints.users, data),
  update: (id, data) => api.put(`${endpoints.users}/${id}`, data),
  remove: (id) => api.delete(`${endpoints.users}/${id}`),
  save: ({ id, data }) => (id ? usersApi.update(id, data) : usersApi.create(data)),
};
