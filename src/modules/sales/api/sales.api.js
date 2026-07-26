import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const salesApi = {
  createSale: (data) => api.post(endpoints.pos.sale, data),
  readyProducts: () =>
    api.get(endpoints.products, { params: { admin: 'true', limit: 10 } }),
  searchProducts: (search) =>
    api.get(endpoints.products, { params: { search, limit: 5, admin: 'true' } }),
  getProduct: (id) => api.get(`${endpoints.products}/${id}`),
  getByBarcode: (barcode) => api.get(`${endpoints.products}/barcode/${barcode}`),
};
