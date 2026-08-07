import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { customersApi } from '@modules/customers/api/customers.api';
import { useListParams } from '@shared/hooks/useListParams';
import { LoadingSpinner, Modal, OrderStatusBadge, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';
import { formatPrice } from '@core/constants';
import { notifyError } from '@shared/services/toast.service';
import { TableScroll } from '@shared/components/TableScroll';

export default function CustomersPage() {
  const [selected, setSelected] = useState(null);
  const { search, setSearch, page, setPage, params } = useListParams();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const openDetail = async (id) => {
    try {
      const res = await customersApi.getById(id);
      setSelected(res.data);
    } catch (err) {
      notifyError(err);
    }
  };

  const customers = data?.data || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">العملاء</h1>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الهاتف..." />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : customers.length === 0 ? (
        <EmptyState message="لا يوجد عملاء" />
      ) : (
        <>
          <TableScroll>
            <table className="admin-table">
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
                      <button onClick={() => openDetail(c.id)} className="btn-outline text-xs py-1">
                        <Eye size={14} /> عرض
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">الهاتف:</span> {selected.phone}
              </div>
              <div>
                <span className="text-gray-500">البريد:</span> {selected.email || '-'}
              </div>
              <div>
                <span className="text-gray-500">الطلبات:</span> {selected.total_orders}
              </div>
              <div>
                <span className="text-gray-500">المشتريات:</span> {formatPrice(selected.total_spent)}
              </div>
            </div>
            {selected.orders?.length > 0 && (
              <div>
                <h3 className="font-bold mb-2">الطلبات</h3>
                {selected.orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex justify-between items-center py-2 border-b dark:border-gray-700 text-sm"
                  >
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
