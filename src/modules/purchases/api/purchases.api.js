import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const purchasesApi = {
  list: (params) => api.get(endpoints.purchases, { params }),
  create: (data) => api.post(endpoints.purchases, data),
  /** Lookups for purchase form (avoids cross-module imports) */
  suppliersAll: () => api.get(endpoints.suppliers, { params: { all: 'true' } }),
  productsLookup: () => api.get(endpoints.products, { params: { admin: 'true', limit: 200 } }),
};
