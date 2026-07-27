import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const productsApi = {
  list: (params) => api.get(endpoints.products, { params }),
  getById: (id) => api.get(`${endpoints.products}/${id}`),
  getByBarcode: (barcode) => api.get(`${endpoints.products}/barcode/${barcode}`),
  create: (data) => api.post(endpoints.products, data),
  update: (id, data) => api.put(`${endpoints.products}/${id}`, data),
  remove: (id) => api.delete(`${endpoints.products}/${id}`),
  save: ({ id, data }) => (id ? productsApi.update(id, data) : productsApi.create(data)),
  seedDemo: () => api.post(`${endpoints.products}/seed-demo`),
  seedHandbags: () => api.post(`${endpoints.products}/seed-handbags`),
  colors: () => api.get(endpoints.colors),
  sizes: () => api.get(endpoints.sizes),
  brands: () => api.get(endpoints.brands),
};
