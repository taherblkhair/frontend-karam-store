import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const storeApi = {
  home: () => api.get(endpoints.store.home),
  products: (params) => api.get(endpoints.store.products, { params }),
  productBySlug: (slug) =>
    api.get(`${endpoints.store.products}/slug/${encodeURIComponent(String(slug || '').trim())}`),
  categories: () => api.get(endpoints.store.categories),
  colors: () => api.get(endpoints.store.colors),
  sizes: () => api.get(endpoints.store.sizes),
  cities: () => api.get(endpoints.store.cities),
  areas: (cityId) => api.get(`${endpoints.store.cities}/${cityId}/areas`),
  settings: () => api.get(endpoints.store.settings),
  shippingCost: (params) => api.get(endpoints.store.shippingCost, { params }),
  createOrder: (data) => api.post(endpoints.store.orders, data),
};
