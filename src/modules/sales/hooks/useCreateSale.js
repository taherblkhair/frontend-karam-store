import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../api/sales.api';
import { notifySuccess, notifyError } from '@shared/services/toast.service';

export function useCreateSale({ onSuccess } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: salesApi.createSale,
    onSuccess: (res) => {
      notifySuccess(res);
      queryClient.invalidateQueries({ queryKey: ['pos-ready-products'] });
      onSuccess?.(res);
    },
    onError: notifyError,
  });
}
