import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const authApi = {
  login: (data) => api.post(endpoints.auth.login, data),
  register: (data) => api.post(endpoints.auth.register, data),
  me: () => api.get(endpoints.auth.me),
};
