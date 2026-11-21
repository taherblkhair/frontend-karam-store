import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const pushApi = {
  config: () => api.get(endpoints.push.config),
  subscriptions: () => api.get(endpoints.push.subscriptions),
  subscribe: (subscription) => api.post(endpoints.push.subscriptions, subscription),
  removeByEndpoint: (endpoint) => api.post(endpoints.push.remove, { endpoint }),
  removeById: (id) => api.delete(`${endpoints.push.subscriptions}/${id}`),
  test: () => api.post(endpoints.push.test),
  logs: () => api.get(endpoints.push.logs),
};
