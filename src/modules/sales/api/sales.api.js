import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const salesApi = {
  createSale: (data) => api.post(endpoints.pos.sale, data),
  recentOrders: (limit = 10) =>
    api.get(endpoints.pos.recentOrders, { params: { limit } }),
  cities: () => api.get(endpoints.cities),
  areas: (cityId) => api.get(`${endpoints.cities}/${cityId}/areas`),
  findCustomers: (search) =>
    api.get(endpoints.customers, { params: { search, limit: 5 } }),
  readyProducts: ({ page = 1, limit = 12 } = {}) =>
    api.get(endpoints.products, { params: { admin: 'true', page, limit } }),
  searchProducts: (search, { page = 1, limit = 12 } = {}) =>
    api.get(endpoints.products, { params: { search, page, limit, admin: 'true' } }),
  getProduct: (id) => api.get(`${endpoints.products}/${id}`),
  getByBarcode: (barcode) => api.get(`${endpoints.products}/barcode/${barcode}`),
};
