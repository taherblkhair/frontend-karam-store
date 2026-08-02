import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';
import { ordersApi } from '../api/orders.api';
import { notifySuccess, notifyError } from '@shared/services/toast.service';

export const orderKeys = {
  all: ['orders'],
  list: (params) => ['orders', params],
  detail: (id) => ['order', id],
};

export function useOrders(listParams) {
  return useQuery({
    queryKey: orderKeys.list(listParams),
    queryFn: () => ordersApi.list(listParams),
  });
}

export function useOrder(id) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersApi.getById(id),
    enabled: !!id,
  });
}

export function useStoreSettings() {
  return useQuery({
    queryKey: ['store-settings'],
    queryFn: () => api.get(endpoints.store.settings),
  });
}

export function useOrderMutations(selectedId, { onStatusSuccess, onUpdateSuccess, onLabelSuccess } = {}) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: orderKeys.all });
    if (selectedId) queryClient.invalidateQueries({ queryKey: orderKeys.detail(selectedId) });
  };

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => ordersApi.updateStatus(id, status),
    onSuccess: (res) => {
      invalidate();
      notifySuccess(res);
      onStatusSuccess?.(res);
    },
    onError: notifyError,
  });

  const updateOrder = useMutation({
    mutationFn: (payload) => ordersApi.update(selectedId, payload),
    onSuccess: (res) => {
      invalidate();
      notifySuccess(res);
      onUpdateSuccess?.(res);
    },
    onError: notifyError,
  });

  const updateShippingLabel = useMutation({
    mutationFn: (label) => ordersApi.updateShippingLabel(selectedId, label),
    onSuccess: (res) => {
      invalidate();
      notifySuccess(res);
      onLabelSuccess?.(res);
    },
    onError: notifyError,
  });

  const generateShippingLabel = useMutation({
    mutationFn: () => ordersApi.generateShippingLabel(selectedId),
    onSuccess: (res) => {
      invalidate();
      notifySuccess(res);
      onLabelSuccess?.(res);
    },
    onError: notifyError,
  });

  const removeOrder = useMutation({
    mutationFn: ordersApi.remove,
    onSuccess: (res) => {
      invalidate();
      notifySuccess(res);
    },
    onError: notifyError,
  });

  return {
    updateStatus,
    updateOrder,
    updateShippingLabel,
    generateShippingLabel,
    removeOrder,
  };
}
