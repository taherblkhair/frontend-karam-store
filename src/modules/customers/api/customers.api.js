import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const customersApi = {
  list: (params) => api.get(endpoints.customers, { params }),
  getById: (id) => api.get(`${endpoints.customers}/${id}`),
};
