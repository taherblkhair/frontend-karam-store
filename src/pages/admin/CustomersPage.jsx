import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import api from '../../api/axios';
import { LoadingSpinner, Modal, OrderStatusBadge } from '../../components/ui';
import { formatPrice } from '../../utils/constants';

export default function CustomersPage() {
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers'),
  });

  const openDetail = async (id) => {
    const res = await api.get(`/customers/${id}`);
    setSelected(res.data);
  };

  const customers = data?.data || [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">العملاء</h1>
      {isLoading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-right p-4">الاسم</th>
                <th className="text-right p-4">الهاتف</th>
                <th className="text-right p-4">الطلبات</th>
                <th className="text-right p-4">إجمالي المشتريات</th>
                <th className="text-right p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t dark:border-gray-700">
                  <td className="p-4">{c.name}</td>
                  <td className="p-4">{c.phone}</td>
                  <td className="p-4">{c.total_orders}</td>
                  <td className="p-4">{formatPrice(c.total_spent)}</td>
                  <td className="p-4">
                    <button onClick={() => openDetail(c.id)} className="btn-outline text-xs py-1"><Eye size={14} /> عرض</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">الهاتف:</span> {selected.phone}</div>
              <div><span className="text-gray-500">البريد:</span> {selected.email || '-'}</div>
              <div><span className="text-gray-500">الطلبات:</span> {selected.total_orders}</div>
              <div><span className="text-gray-500">المشتريات:</span> {formatPrice(selected.total_spent)}</div>
            </div>
            {selected.orders?.length > 0 && (
              <div>
                <h3 className="font-bold mb-2">الطلبات</h3>
                {selected.orders.map((o) => (
                  <div key={o.id} className="flex justify-between items-center py-2 border-b dark:border-gray-700 text-sm">
                    <span>{o.order_number}</span>
                    <OrderStatusBadge status={o.status} />
                    <span>{formatPrice(o.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
