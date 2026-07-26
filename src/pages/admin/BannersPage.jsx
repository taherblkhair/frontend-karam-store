import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { notifySuccess, notifyError } from '../../utils/notify';
import { useFormErrors } from '../../hooks/useFormErrors';
import { useListParams } from '../../hooks/useListParams';
import api from '../../api/axios';
import { LoadingSpinner, Modal, FieldError, EmptyState } from '../../components/ui';
import { SearchInput, Pagination } from '../../components/ListControls';
import { ImageUpload } from '../../components/ImageUpload';

const emptyBanner = {
  title_ar: '',
  title_en: '',
  subtitle_ar: '',
  subtitle_en: '',
  image: '',
  link: '',
  sort_order: 0,
  is_active: true,
};

export default function BannersPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyBanner);
  const { search, setSearch, page, setPage, params } = useListParams();

  const { data, isLoading } = useQuery({
    queryKey: ['banners', params],
    queryFn: () => api.get('/banners', { params }),
  });

  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => (id ? api.put(`/banners/${id}`, data) : api.post('/banners', data)),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['banners']);
      setModalOpen(false);
      clearErrors();
      notifySuccess(res);
    },
    onError: (err) => {
      applyApiError(err);
      notifyError(err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/banners/${id}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['banners']);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const banners = data?.data || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">البنرات</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث بعنوان البنر..." />
          <button
            onClick={() => {
              setEditing(null);
              setForm(emptyBanner);
              clearErrors();
              setModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} /> إضافة بنر
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : banners.length === 0 ? (
        <EmptyState message="لا توجد بنرات" />
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {banners.map((b) => (
              <div key={b.id} className="card overflow-hidden">
                {b.image ? (
                  <img src={b.image} alt="" className="w-full h-40 object-cover" />
                ) : (
                  <div className="h-40 bg-gray-200" />
                )}
                <div className="p-4 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{b.title_ar}</h3>
                    <p className="text-sm text-gray-500">{b.subtitle_ar}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditing(b);
                        setForm(b);
                        clearErrors();
                        setModalOpen(true);
                      }}
                      className="text-blue-500 p-2"
                    >
                      <Edit size={16} />
                    </button>
                    <button onClick={() => deleteMutation.mutate(b.id)} className="text-red-500 p-2">
                      <Trash2 size={16} />
                    </button>
                  </div>
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
        title={editing ? 'تعديل بنر' : 'إضافة بنر'}
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
              placeholder="العنوان"
              required
              value={form.title_ar}
              onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
            />
            <FieldError message={getFieldError('title_ar')} />
          </div>
          <input
            className="input"
            placeholder="العنوان الفرعي"
            value={form.subtitle_ar}
            onChange={(e) => setForm({ ...form, subtitle_ar: e.target.value })}
          />
          <input
            className="input"
            placeholder="الرابط"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
          />
          <ImageUpload label="صورة البنر *" value={form.image} onChange={(url) => setForm({ ...form, image: url })} />
          <button type="submit" className="btn-primary w-full">
            حفظ
          </button>
        </form>
      </Modal>
    </div>
  );
}
