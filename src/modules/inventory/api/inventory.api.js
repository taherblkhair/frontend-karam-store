import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const inventoryApi = {
  movements: (params) => api.get(endpoints.inventory.movements, { params }),
  lowStock: () => api.get(endpoints.inventory.lowStock),
  adjust: (data) => api.post(endpoints.inventory.adjust, data),
  productsLookup: () => api.get(endpoints.products, { params: { admin: 'true', limit: 200 } }),
};
