import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

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
  announcement: () => api.get(`${endpoints.store.campaigns}/announcement`),
  active: () => api.get(`${endpoints.store.campaigns}/active`),
  bySlug: (slug, { preview = false } = {}) =>
    api.get(`${endpoints.store.campaigns}/${encodeURIComponent(String(slug || '').trim())}`, {
      params: preview ? { preview: 1 } : undefined,
    }),
  cartPrices: (items) => api.post(endpoints.store.cartPrices, { items }),
};
