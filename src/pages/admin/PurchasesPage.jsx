import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { notifySuccess, notifyError } from '../../utils/notify';
import api from '../../api/axios';
import { LoadingSpinner, Modal } from '../../components/ui';
import { formatPrice } from '../../utils/constants';

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', items: [{ product_id: '', quantity: '', unit_cost: '' }] });

  const { data, isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/purchases'),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/purchases', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['purchases']);
      setModalOpen(false);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      supplier_id: parseInt(form.supplier_id),
      items: form.items.map((i) => ({
        product_id: parseInt(i.product_id),
        quantity: parseInt(i.quantity),
        unit_cost: parseFloat(i.unit_cost),
      })),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">المشتريات</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={18} /> فاتورة شراء</button>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-right p-4">رقم الفاتورة</th>
                <th className="text-right p-4">المورد</th>
                <th className="text-right p-4">المبلغ</th>
                <th className="text-right p-4">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((p) => (
                <tr key={p.id} className="border-t dark:border-gray-700">
                  <td className="p-4">{p.invoice_number}</td>
                  <td className="p-4">{p.supplier_name}</td>
                  <td className="p-4">{formatPrice(p.total)}</td>
                  <td className="p-4">{new Date(p.purchase_date).toLocaleDateString('ar')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="فاتورة شراء جديدة">
        <form onSubmit={handleSubmit} className="space-y-4">
          <select className="input" required value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
            <option value="">اختر المورد</option>
            {suppliers?.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {form.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2">
              <input className="input" placeholder="رقم المنتج" required value={item.product_id} onChange={(e) => {
                const items = [...form.items];
                items[idx].product_id = e.target.value;
                setForm({ ...form, items });
              }} />
              <input className="input" type="number" placeholder="الكمية" required value={item.quantity} onChange={(e) => {
                const items = [...form.items];
                items[idx].quantity = e.target.value;
                setForm({ ...form, items });
              }} />
              <input className="input" type="number" step="0.01" placeholder="التكلفة" required value={item.unit_cost} onChange={(e) => {
                const items = [...form.items];
                items[idx].unit_cost = e.target.value;
                setForm({ ...form, items });
              }} />
            </div>
          ))}
          <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { product_id: '', quantity: '', unit_cost: '' }] })} className="btn-outline w-full">
            + إضافة منتج
          </button>
          <button type="submit" className="btn-primary w-full">حفظ</button>
        </form>
      </Modal>
    </div>
  );
}
