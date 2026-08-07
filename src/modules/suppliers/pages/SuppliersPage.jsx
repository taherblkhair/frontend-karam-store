import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { useListParams } from '@shared/hooks/useListParams';
import { useConfirm } from '@shared/hooks/useConfirm';
import { suppliersApi } from '@modules/suppliers/api/suppliers.api';
import { LoadingSpinner, Modal, FieldError, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';
import { TableScroll } from '@shared/components/TableScroll';

const emptySupplier = { name: '', phone: '', email: '', address: '', notes: '' };

export default function SuppliersPage() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySupplier);
  const { search, setSearch, page, setPage, withExtra } = useListParams();
  const listParams = withExtra({ all: 'true' });

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', listParams],
    queryFn: () => suppliersApi.list(listParams),
  });

  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();

  const saveMutation = useMutation({
    mutationFn: suppliersApi.save,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['suppliers']);
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
    mutationFn: suppliersApi.remove,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['suppliers']);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const suppliers = data?.data || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">الموردون</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الهاتف..." />
          <button
            onClick={() => {
              setEditing(null);
              setForm(emptySupplier);
              clearErrors();
              setModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} /> إضافة مورد
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : suppliers.length === 0 ? (
        <EmptyState message="لا يوجد موردون" />
      ) : (
        <>
          <TableScroll>
            <table className="admin-table">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-right p-4">الاسم</th>
                  <th className="text-right p-4">الهاتف</th>
                  <th className="text-right p-4">البريد</th>
                  <th className="text-right p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-t dark:border-gray-700">
                    <td className="p-4">{s.name}</td>
                    <td className="p-4">{s.phone || '-'}</td>
                    <td className="p-4">{s.email || '-'}</td>
                    <td className="p-4">
                      <button
                        onClick={() => {
                          setEditing(s);
                          setForm(s);
                          clearErrors();
                          setModalOpen(true);
                        }}
                        className="text-blue-500 p-2"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'حذف المورد',
                            message: `هل أنت متأكد من حذف المورد «${s.name}»؟`,
                            confirmText: 'حذف',
                          });
                          if (ok) deleteMutation.mutate(s.id);
                        }}
                        className="text-red-500 p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <Pagination pagination={data?.pagination} page={page} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          clearErrors();
        }}
        title={editing ? 'تعديل مورد' : 'إضافة مورد'}
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
              placeholder="اسم المورد *"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <FieldError message={getFieldError('name')} />
          </div>
          <input
            className="input"
            placeholder="الهاتف"
            value={form.phone || ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className="input"
            placeholder="البريد"
            value={form.email || ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <textarea
            className="input"
            placeholder="العنوان"
            rows={2}
            value={form.address || ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <button type="submit" className="btn-primary w-full">
            حفظ
          </button>
        </form>
      </Modal>
    </div>
  );
}
