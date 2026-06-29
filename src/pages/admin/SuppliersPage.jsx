import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { notifySuccess, notifyError } from '../../utils/notify';
import { useFormErrors } from '../../hooks/useFormErrors';
import api from '../../api/axios';
import { LoadingSpinner, Modal, FieldError } from '../../components/ui';

const emptySupplier = { name: '', phone: '', email: '', address: '', notes: '' };

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySupplier);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers'),
  });

  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => (id ? api.put(`/suppliers/${id}`, data) : api.post('/suppliers', data)),
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
    mutationFn: (id) => api.delete(`/suppliers/${id}`),
    onSuccess: (res) => { queryClient.invalidateQueries(['suppliers']); notifySuccess(res); },
    onError: notifyError,
  });

  const suppliers = data?.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">الموردون</h1>
        <button onClick={() => { setEditing(null); setForm(emptySupplier); setModalOpen(true); }} className="btn-primary">
          <Plus size={18} /> إضافة مورد
        </button>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
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
                    <button onClick={() => { setEditing(s); setForm(s); setModalOpen(true); }} className="text-blue-500 p-2"><Edit size={16} /></button>
                    <button onClick={() => deleteMutation.mutate(s.id)} className="text-red-500 p-2"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); clearErrors(); }} title={editing ? 'تعديل مورد' : 'إضافة مورد'} alert={formError}>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ id: editing?.id, data: form }); }} className="space-y-4">
          <div>
            <input className="input" placeholder="اسم المورد *" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FieldError message={getFieldError('name')} />
          </div>
          <input className="input" placeholder="الهاتف" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input" placeholder="البريد" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <textarea className="input" placeholder="العنوان" rows={2} value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <button type="submit" className="btn-primary w-full">حفظ</button>
        </form>
      </Modal>
    </div>
  );
}
