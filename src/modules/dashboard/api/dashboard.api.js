import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const dashboardApi = {
  get: () => api.get(endpoints.dashboard),
};
