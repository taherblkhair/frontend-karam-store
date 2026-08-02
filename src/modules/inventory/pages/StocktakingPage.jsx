import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ClipboardList, Plus, Save, Check, X, Search } from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { useListParams } from '@shared/hooks/useListParams';
import { useConfirm } from '@shared/hooks/useConfirm';
import { inventoryApi } from '@modules/inventory/api/inventory.api';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';

const STATUS = {
  draft: { label: 'مسودة', className: 'bg-yellow-100 text-yellow-800' },
  applied: { label: 'معتمد', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'ملغى', className: 'bg-red-100 text-red-800' },
};

function StatusBadge({ status }) {
  const meta = STATUS[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}

function StocktakingList() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { search, setSearch, page, setPage, params } = useListParams();

  const { data, isLoading } = useQuery({
    queryKey: ['stocktakings', params],
    queryFn: () => inventoryApi.stocktakings.list(params),
  });

  const createMutation = useMutation({
    mutationFn: () => inventoryApi.stocktakings.create({}),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['stocktakings']);
      notifySuccess(res);
      if (res?.data?.id) navigate(`/admin/inventory/stocktaking/${res.data.id}`);
    },
    onError: notifyError,
  });

  const startStocktaking = async () => {
    const ok = await confirm({
      title: 'بدء جرد مخزون',
      message: 'سيتم أخذ لقطة من كميات النظام الحالية لكل الأصناف والمتغيرات. هل تريد المتابعة؟',
      confirmText: 'بدء الجرد',
      variant: 'warning',
    });
    if (!ok) return;
    createMutation.mutate();
  };

  const rows = data?.data || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link to="/admin/inventory" className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1 mb-2">
            <ArrowRight size={14} /> المخزون
          </Link>
          <h1 className="text-2xl font-bold">جرد المخزون</h1>
          <p className="text-sm text-gray-500 mt-1">مقارنة الكمية الفعلية مع كمية النظام وتطبيق الفروقات</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الجرد..." />
          <button
            type="button"
            className="btn-primary"
            onClick={startStocktaking}
            disabled={createMutation.isPending}
          >
            <Plus size={18} />
            {createMutation.isPending ? 'جاري الإنشاء...' : 'بدء جرد جديد'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !rows.length ? (
        <EmptyState message="لا توجد جلسات جرد بعد" />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-right p-4">الرقم</th>
                  <th className="text-right p-4">الحالة</th>
                  <th className="text-right p-4">الأصناف</th>
                  <th className="text-right p-4">تم جردها</th>
                  <th className="text-right p-4">بواسطة</th>
                  <th className="text-right p-4">التاريخ</th>
                  <th className="text-right p-4" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t dark:border-gray-700">
                    <td className="p-4 font-medium">{row.code}</td>
                    <td className="p-4"><StatusBadge status={row.status} /></td>
                    <td className="p-4">{row.items_count}</td>
                    <td className="p-4">{row.counted_count}</td>
                    <td className="p-4">{row.started_by_name}</td>
                    <td className="p-4">{new Date(row.started_at || row.created_at).toLocaleString('ar')}</td>
                    <td className="p-4">
                      <Link
                        to={`/admin/inventory/stocktaking/${row.id}`}
                        className="btn-outline text-sm py-1.5 px-3"
                      >
                        <ClipboardList size={14} /> فتح
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={data?.pagination} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function StocktakingDetail() {
  const { id } = useParams();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [drafts, setDrafts] = useState({});
  const [showDiffOnly, setShowDiffOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['stocktaking', id],
    queryFn: () => inventoryApi.stocktakings.get(id),
    enabled: !!id,
  });

  const detail = data?.data;

  useEffect(() => {
    if (!detail?.items) return;
    const next = {};
    detail.items.forEach((item) => {
      next[item.id] = item.counted_qty != null ? String(item.counted_qty) : '';
    });
    setDrafts(next);
  }, [detail]);

  const saveMutation = useMutation({
    mutationFn: (items) => inventoryApi.stocktakings.updateItems(id, items),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['stocktaking', id]);
      queryClient.invalidateQueries(['stocktakings']);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const applyMutation = useMutation({
    mutationFn: () => inventoryApi.stocktakings.apply(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['stocktaking', id]);
      queryClient.invalidateQueries(['stocktakings']);
      queryClient.invalidateQueries(['inventory-movements']);
      queryClient.invalidateQueries(['low-stock']);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const cancelMutation = useMutation({
    mutationFn: () => inventoryApi.stocktakings.cancel(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['stocktaking', id]);
      queryClient.invalidateQueries(['stocktakings']);
      notifySuccess(res);
      navigate('/admin/inventory/stocktaking');
    },
    onError: notifyError,
  });

  const items = detail?.items || [];
  const isDraft = detail?.status === 'draft';

  const filteredItems = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return items.filter((item) => {
      const countedRaw = drafts[item.id];
      const counted = countedRaw === '' || countedRaw == null ? null : Number(countedRaw);
      const diff = counted == null ? null : counted - Number(item.system_qty || 0);
      if (showDiffOnly && (diff == null || diff === 0)) return false;
      if (!q) return true;
      return (
        item.product_name?.toLowerCase().includes(q)
        || item.variant_info?.toLowerCase().includes(q)
        || item.product_sku?.toLowerCase().includes(q)
        || item.variant_sku?.toLowerCase().includes(q)
      );
    });
  }, [items, filter, drafts, showDiffOnly]);

  const stats = useMemo(() => {
    let counted = 0;
    let diffs = 0;
    items.forEach((item) => {
      const raw = drafts[item.id];
      if (raw === '' || raw == null) return;
      counted += 1;
      if (Number(raw) !== Number(item.system_qty || 0)) diffs += 1;
    });
    return { counted, diffs, total: items.length };
  }, [items, drafts]);

  const buildPayload = () =>
    items
      .map((item) => {
        const raw = drafts[item.id];
        return {
          id: item.id,
          counted_qty: raw === '' || raw == null ? null : parseInt(raw, 10),
        };
      })
      .filter((row) => {
        const original = items.find((i) => i.id === row.id);
        const originalVal = original?.counted_qty != null ? String(original.counted_qty) : '';
        const draftVal = drafts[row.id] ?? '';
        return draftVal !== originalVal;
      });

  const handleSave = () => {
    const payload = buildPayload();
    if (!payload.length) {
      notifyError({ message: 'لا توجد تغييرات للحفظ' });
      return;
    }
    const invalid = payload.find((p) => p.counted_qty != null && (Number.isNaN(p.counted_qty) || p.counted_qty < 0));
    if (invalid) {
      notifyError({ message: 'تحقق من كميات الجرد المدخلة' });
      return;
    }
    saveMutation.mutate(payload);
  };

  const handleApply = async () => {
    const dirty = buildPayload();
    if (dirty.length) {
      notifyError({ message: 'احفظ كميات الجرد أولاً قبل الاعتماد' });
      return;
    }
    if (stats.counted === 0) {
      notifyError({ message: 'أدخل كمية جرد لصنف واحد على الأقل' });
      return;
    }
    const ok = await confirm({
      title: 'اعتماد الجرد',
      message: `سيتم تحديث المخزون حسب الكميات المجردة (${stats.counted} صنف، منها ${stats.diffs} بفرق). هل أنت متأكد؟`,
      confirmText: 'اعتماد وتطبيق',
      variant: 'danger',
    });
    if (!ok) return;
    applyMutation.mutate();
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: 'إلغاء الجرد',
      message: 'سيتم إلغاء هذه المسودة دون تعديل المخزون. هل أنت متأكد؟',
      confirmText: 'إلغاء الجرد',
      variant: 'danger',
    });
    if (!ok) return;
    cancelMutation.mutate();
  };

  const fillSystemQty = () => {
    setDrafts((prev) => {
      const next = { ...prev };
      filteredItems.forEach((item) => {
        if (next[item.id] === '' || next[item.id] == null) {
          next[item.id] = String(item.system_qty ?? 0);
        }
      });
      return next;
    });
  };

  if (isLoading || !detail) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
        <div>
          <Link to="/admin/inventory/stocktaking" className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1 mb-2">
            <ArrowRight size={14} /> جلسات الجرد
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{detail.code}</h1>
            <StatusBadge status={detail.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            بدأ بواسطة {detail.started_by_name} · {new Date(detail.started_at).toLocaleString('ar')}
          </p>
        </div>

        {isDraft && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline" onClick={handleCancel} disabled={cancelMutation.isPending}>
              <X size={16} /> إلغاء
            </button>
            <button type="button" className="btn-secondary" onClick={handleSave} disabled={saveMutation.isPending}>
              <Save size={16} /> {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الكميات'}
            </button>
            <button type="button" className="btn-primary" onClick={handleApply} disabled={applyMutation.isPending}>
              <Check size={16} /> {applyMutation.isPending ? 'جاري الاعتماد...' : 'اعتماد الجرد'}
            </button>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500">إجمالي الأصناف</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">تم إدخال جردها</p>
          <p className="text-xl font-bold">{stats.counted}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">فروقات</p>
          <p className="text-xl font-bold text-amber-600">{stats.diffs}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            className="input pr-9"
            placeholder="بحث بالمنتج أو المتغير أو SKU..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm px-3 py-2 card cursor-pointer">
          <input
            type="checkbox"
            checked={showDiffOnly}
            onChange={(e) => setShowDiffOnly(e.target.checked)}
          />
          الفروقات فقط
        </label>
        {isDraft && (
          <button type="button" className="btn-outline text-sm" onClick={fillSystemQty}>
            تعبئة الفارغ بكمية النظام
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-h-[28rem]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="text-right p-3">الصنف</th>
                <th className="text-right p-3">المتغير</th>
                <th className="text-right p-3">كمية النظام</th>
                <th className="text-right p-3">الكمية المجردة</th>
                <th className="text-right p-3">الفرق</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const raw = drafts[item.id];
                const counted = raw === '' || raw == null ? null : Number(raw);
                const diff = counted == null || Number.isNaN(counted)
                  ? null
                  : counted - Number(item.system_qty || 0);
                return (
                  <tr
                    key={item.id}
                    className={`border-t dark:border-gray-700 ${
                      diff != null && diff !== 0 ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-medium">{item.product_name}</div>
                      {(item.variant_sku || item.product_sku) && (
                        <div className="text-xs text-gray-400">{item.variant_sku || item.product_sku}</div>
                      )}
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">{item.variant_info || '—'}</td>
                    <td className="p-3 font-medium">{item.system_qty}</td>
                    <td className="p-3">
                      {isDraft ? (
                        <input
                          className="input w-24 py-1.5"
                          type="number"
                          min="0"
                          step="1"
                          value={raw ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                        />
                      ) : (
                        <span>{item.counted_qty ?? '—'}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {diff == null ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className={diff === 0 ? 'text-gray-500' : diff > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!filteredItems.length && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">لا توجد نتائج</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function StocktakingPage() {
  const { id } = useParams();
  if (id) return <StocktakingDetail />;
  return <StocktakingList />;
}
