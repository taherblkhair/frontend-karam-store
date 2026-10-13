import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const reportsApi = {
  sales: () => api.get(endpoints.reports.sales),
  profit: (params) => api.get(endpoints.reports.profit, { params }),
  profitAnalysis: (params) =>
    api.get(endpoints.reports.profitAnalysis, {
      params,
      timeout: params?.export ? 60000 : undefined,
    }),
  inventory: () => api.get(endpoints.reports.inventory),
  stockAvailability: (params) =>
    api.get(endpoints.reports.stockAvailability, {
      params,
      timeout: params?.export ? 60000 : undefined,
    }),
  products: () => api.get(endpoints.reports.products),
};
