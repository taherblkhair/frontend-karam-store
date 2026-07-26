import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit } from 'lucide-react';
import { notifySuccess, notifyError } from '../../utils/notify';
import { useFormErrors } from '../../hooks/useFormErrors';
import { useListParams } from '../../hooks/useListParams';
import api from '../../api/axios';
import { LoadingSpinner, Modal, FieldError, EmptyState } from '../../components/ui';
import { SearchInput, Pagination } from '../../components/ListControls';
import { ImageUpload, ImagePreview } from '../../components/ImageUpload';

const emptyCat = {
  name_ar: '',
  name_en: '',
  slug: '',
  description: '',
  image: '',
  sort_order: 0,
  is_active: true,
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCat);
  const { search, setSearch, page, setPage, params } = useListParams();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories', params],
    queryFn: () => api.get('/categories', { params }),
  });

  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => (id ? api.put(`/categories/${id}`, data) : api.post('/categories', data)),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-categories']);
      setModalOpen(false);
      setEditing(null);
      setForm(emptyCat);
      clearErrors();
      notifySuccess(res);
    },
    onError: (err) => {
      applyApiError(err);
      notifyError(err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-categories']);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ ...cat, is_active: !!cat.is_active });
    clearErrors();
    setModalOpen(true);
  };

  const categories = data?.data || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">الفئات</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث باسم الفئة..." />
          <button
            onClick={() => {
              setEditing(null);
              setForm(emptyCat);
              clearErrors();
              setModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} /> إضافة فئة
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : categories.length === 0 ? (
        <EmptyState message="لا توجد فئات" />
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="card p-4 flex gap-4">
                <ImagePreview url={cat.image} size="md" />
                <div className="flex-1">
                  <h3 className="font-medium">{cat.name_ar}</h3>
                  <p className="text-sm text-gray-500">{cat.slug}</p>
                  <p className="text-xs text-gray-400 mt-1">ترتيب: {cat.sort_order}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openEdit(cat)} className="text-blue-500 p-2">
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => window.confirm('حذف؟') && deleteMutation.mutate(cat.id)}
                    className="text-red-500 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination pagination={data?.pagination} page={page} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          clearErrors();
        }}
        title={editing ? 'تعديل فئة' : 'إضافة فئة'}
        alert={formError}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate({ id: editing?.id, data: form });
          }}
          className="space-y-4"
        >
          <div>
            <input
              className="input"
              placeholder="اسم الفئة *"
              required
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            />
            <FieldError message={getFieldError('name_ar')} />
          </div>
          <input
            className="input"
            placeholder="Slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <textarea
            className="input"
            placeholder="الوصف"
            rows={2}
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            className="input"
            type="number"
            placeholder="الترتيب"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
          />
          <ImageUpload label="صورة الفئة" value={form.image} onChange={(url) => setForm({ ...form, image: url })} />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />{' '}
            نشط
          </label>
          <button type="submit" className="btn-primary w-full">
            حفظ
          </button>
        </form>
      </Modal>
    </div>
  );
}
