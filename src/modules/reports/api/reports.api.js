import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const reportsApi = {
  sales: () => api.get(endpoints.reports.sales),
  profit: () => api.get(endpoints.reports.profit),
  inventory: () => api.get(endpoints.reports.inventory),
  stockAvailability: (params) =>
    api.get(endpoints.reports.stockAvailability, {
      params,
      timeout: params?.export ? 60000 : undefined,
    }),
  products: () => api.get(endpoints.reports.products),
};
