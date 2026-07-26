import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';

export const settingsApi = {
  get: () => api.get(endpoints.settings),
  update: (payload) => api.put(endpoints.settings, payload),
  cities: () => api.get(endpoints.cities),
  updateShippingRate: (payload) => api.put(endpoints.shippingRates, payload),
};
