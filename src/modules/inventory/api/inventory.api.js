import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const inventoryApi = {
  movements: (params) => api.get(endpoints.inventory.movements, { params }),
  levels: (params) => api.get(endpoints.inventory.levels, { params }),
  lowStock: () => api.get(endpoints.inventory.lowStock),
  adjust: (data) => api.post(endpoints.inventory.adjust, data),
  productsLookup: () => api.get(endpoints.products, { params: { admin: 'true', limit: 200 } }),
  stocktakings: {
    list: (params) => api.get(endpoints.inventory.stocktakings, { params }),
    get: (id) => api.get(`${endpoints.inventory.stocktakings}/${id}`),
    create: (data = {}) => api.post(endpoints.inventory.stocktakings, data),
    updateItems: (id, items) =>
      api.patch(`${endpoints.inventory.stocktakings}/${id}/items`, { items }),
    apply: (id) => api.post(`${endpoints.inventory.stocktakings}/${id}/apply`),
    cancel: (id) => api.post(`${endpoints.inventory.stocktakings}/${id}/cancel`),
  },
};
