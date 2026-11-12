import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';
import { withEarlyFetch } from '@core/api/earlyFetch';

const productSlugPath = (slug) =>
  `${endpoints.store.products}/slug/${encodeURIComponent(String(slug || '').trim())}`;

export const storeApi = {
  home: () => withEarlyFetch(endpoints.store.home, () => api.get(endpoints.store.home)),
  products: (params) => api.get(endpoints.store.products, { params }),
  productBySlug: (slug) => {
    const path = productSlugPath(slug);
    return withEarlyFetch(path, () => api.get(path));
  },
  categories: () => api.get(endpoints.store.categories),
  colors: () => api.get(endpoints.store.colors),
  sizes: () => api.get(endpoints.store.sizes),
  brands: () => api.get(endpoints.store.brands),
  cities: () => api.get(endpoints.store.cities),
  areas: (cityId) => api.get(`${endpoints.store.cities}/${cityId}/areas`),
  settings: () =>
    withEarlyFetch(endpoints.store.settings, () => api.get(endpoints.store.settings)),
  shippingCost: (params) => api.get(endpoints.store.shippingCost, { params }),
  /**
   * JSON for cash on delivery; FormData (order payload + receipt) for bank transfer.
   * The instance defaults to JSON, and axios turns FormData into JSON unless told otherwise.
   */
  createOrder: (data) =>
    data instanceof FormData
      ? api.post(endpoints.store.orders, data, { headers: { 'Content-Type': 'multipart/form-data' } })
      : api.post(endpoints.store.orders, data),
  /** Logged-in customer's own orders (account page) */
  myOrders: () => api.get(`${endpoints.store.orders}/mine`),
  /** Read-only tracking: { query, phone } or { query, token } */
  trackOrder: (data) => api.post(`${endpoints.store.orders}/track`, data),
};
