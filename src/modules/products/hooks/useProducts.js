import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@core/api/axios';
import { endpoints } from '@core/api/endpoints';
import { productsApi } from '../api/products.api';
import { notifySuccess, notifyError } from '@shared/services/toast.service';

export const productKeys = {
  all: ['admin-products'],
  list: (params) => ['admin-products', params],
  detail: (id) => ['product', id],
  meta: {
    colors: ['colors'],
    sizes: ['sizes'],
    brands: ['brands'],
    categories: ['categories-all'],
  },
};

export function useProducts(listParams) {
  return useQuery({
    queryKey: productKeys.list(listParams),
    queryFn: () => productsApi.list(listParams),
  });
}

export function useProductMeta() {
  const categories = useQuery({
    queryKey: productKeys.meta.categories,
    queryFn: () => api.get(endpoints.categories, { params: { all: 'true' } }),
  });
  const colors = useQuery({
    queryKey: productKeys.meta.colors,
    queryFn: () => productsApi.colors(),
  });
  const sizes = useQuery({
    queryKey: productKeys.meta.sizes,
    queryFn: () => productsApi.sizes(),
  });
  const brands = useQuery({
    queryKey: productKeys.meta.brands,
    queryFn: () => productsApi.brands(),
  });

  return { categories, colors, sizes, brands };
}

export function useSaveProduct({ onSuccess, onError } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productsApi.save,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      notifySuccess(res);
      onSuccess?.(res);
    },
    onError: (err) => {
      notifyError(err);
      onError?.(err);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productsApi.remove,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      notifySuccess(res);
    },
    onError: notifyError,
  });
}

export function useSeedDemoProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productsApi.seedDemo,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      notifySuccess(res);
    },
    onError: notifyError,
  });
}

export async function fetchProduct(id) {
  const res = await productsApi.getById(id);
  return res.data;
}
