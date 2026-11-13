import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';
import { withEarlyFetch } from '@core/api/earlyFetch';

const base = endpoints.campaigns;

export const campaignsApi = {
  list: (params) => api.get(base, { params }),
  get: (id) => api.get(`${base}/${id}`),
  create: (data) => api.post(base, data),
  update: (id, data) => api.put(`${base}/${id}`, data),
  save: ({ id, data }) => (id ? campaignsApi.update(id, data) : campaignsApi.create(data)),
  setStatus: ({ id, status }) => api.patch(`${base}/${id}/status`, { status }),
  remove: (id) => api.delete(`${base}/${id}`),
  addProducts: ({ id, items }) => api.post(`${base}/${id}/products`, { items }),
  updateProductPrice: ({ id, productId, campaign_price }) =>
    api.put(`${base}/${id}/products/${productId}`, { campaign_price }),
  removeProducts: ({ id, productIds }) =>
    api.post(`${base}/${id}/products/remove`, { product_ids: productIds }),
};

/** Storefront (public) campaign endpoints */
export const storeCampaignsApi = {
  // Started by index.html with the page (see earlyFetch) — the bar is usually known before first paint
  announcement: () => {
    const path = `${endpoints.store.campaigns}/announcement`;
    return withEarlyFetch(path, () => api.get(path));
  },
  active: () => api.get(`${endpoints.store.campaigns}/active`),
  bySlug: (slug, { preview = false } = {}) =>
    api.get(`${endpoints.store.campaigns}/${encodeURIComponent(String(slug || '').trim())}`, {
      params: preview ? { preview: 1 } : undefined,
    }),
  cartPrices: (items) => api.post(endpoints.store.cartPrices, { items }),
};
