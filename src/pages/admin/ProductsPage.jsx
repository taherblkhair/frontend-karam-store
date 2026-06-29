import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Sparkles } from 'lucide-react';
import { notifySuccess, notifyError } from '../../utils/notify';
import { useFormErrors } from '../../hooks/useFormErrors';
import api from '../../api/axios';
import { LoadingSpinner, Modal, EmptyState } from '../../components/ui';
import { ImagePreview } from '../../components/ImageUpload';
import { ProductForm } from '../../components/ProductForm';
import { formatPrice } from '../../utils/constants';

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', search],
    queryFn: () => api.get('/products', { params: { search, admin: 'true' } }),
  });

  const { data: categoriesData } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories') });
  const { data: colorsData } = useQuery({ queryKey: ['colors'], queryFn: () => api.get('/colors') });
  const { data: sizesData } = useQuery({ queryKey: ['sizes'], queryFn: () => api.get('/sizes') });
  const { data: brandsData } = useQuery({ queryKey: ['brands'], queryFn: () => api.get('/brands') });

  const { fieldErrors, formError, clearErrors, applyApiError, getFieldError } = useFormErrors();

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => (id ? api.put(`/products/${id}`, data) : api.post('/products', data)),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-products']);
      setModalOpen(false);
      setEditing(null);
      clearErrors();
      notifySuccess(res);
    },
    onError: (err) => {
      applyApiError(err);
      notifyError(err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-products']);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const seedMutation = useMutation({
    mutationFn: () => api.post('/products/seed-demo'),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-products']);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const openCreate = () => { setEditing(null); setModalOpen(true); };

  const openEdit = async (id) => {
    try {
      const res = await api.get(`/products/${id}`);
      setEditing(res.data);
      setModalOpen(true);
    } catch (err) {
      notifyError(err);
    }
  };

  const products = data?.data || [];
  const lookup = {
    categories: categoriesData?.data,
    colors: colorsData?.data,
    sizes: sizesData?.data,
    brands: brandsData?.data,
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">المنتجات</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input className="input pr-10" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="btn-secondary">
            <Sparkles size={16} /> منتجات تجريبية
          </button>
          <button onClick={openCreate} className="btn-primary"><Plus size={18} /> إضافة</button>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : products.length === 0 ? (
        <EmptyState message="لا توجد منتجات — أضف منتجاً أو استخدم «منتجات تجريبية»" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-right p-4">صورة</th>
                <th className="text-right p-4">المنتج</th>
                <th className="text-right p-4">SKU</th>
                <th className="text-right p-4">السعر</th>
                <th className="text-right p-4">المخزون</th>
                <th className="text-right p-4">الحالة</th>
                <th className="text-right p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t dark:border-gray-700">
                  <td className="p-4"><ImagePreview url={p.primary_image} /></td>
                  <td className="p-4">
                    <div className="font-medium">{p.name_ar}</div>
                    {p.has_variants ? <span className="text-xs text-gray-500">متغيرات</span> : null}
                  </td>
                  <td className="p-4">{p.sku || '-'}</td>
                  <td className="p-4">{formatPrice(p.price)}</td>
                  <td className="p-4">{p.total_stock}</td>
                  <td className="p-4">
                    <span className={`badge ${p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{p.status}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p.id)} className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                      <button onClick={() => window.confirm('حذف المنتج؟') && deleteMutation.mutate(p.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); clearErrors(); }} title={editing ? 'تعديل منتج' : 'إضافة منتج'} size="xl" alert={formError}>
        <ProductForm
          initial={editing}
          categories={lookup.categories}
          colors={lookup.colors}
          sizes={lookup.sizes}
          brands={lookup.brands}
          loading={saveMutation.isPending}
          onSubmit={(payload) => saveMutation.mutate({ id: editing?.id, data: payload })}
          getFieldError={getFieldError}
        />
      </Modal>
    </div>
  );
}
