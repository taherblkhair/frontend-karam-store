import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Eye, Play, Pause } from 'lucide-react';
import { notifyError, notifySuccess } from '@shared/services/toast.service';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { useListParams } from '@shared/hooks/useListParams';
import { useConfirm } from '@shared/hooks/useConfirm';
import { LoadingSpinner, Modal, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';
import { TableScroll } from '@shared/components/TableScroll';
import { ImagePreview } from '@shared/components/ImageUpload';
import { campaignsApi } from '@modules/campaigns/api/campaigns.api';
import { CampaignForm } from '@modules/campaigns/components/CampaignForm';
import { CampaignStatusBadge } from '@modules/campaigns/components/CampaignStatusBadge';
import { CAMPAIGN_STATUS_FILTERS, formatDateTime } from '@modules/campaigns/utils/campaign';

/** Activate / pause — the manual switch on top of the date window */
function canPause(c) {
  return c.status === 'published' && c.computed_status !== 'expired';
}

function CampaignActions({ campaign, onEdit, onToggle, onDelete }) {
  const pausable = canPause(campaign);
  return (
    <div className="flex gap-1 shrink-0">
      <Link
        to={`/admin/campaigns/${campaign.id}`}
        className="text-primary-600 p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
        aria-label="التفاصيل والمنتجات"
        title="التفاصيل والمنتجات"
      >
        <Eye size={16} />
      </Link>
      <button
        type="button"
        onClick={() => onEdit(campaign)}
        className="text-blue-500 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
        aria-label="تعديل"
        title="تعديل"
      >
        <Edit size={16} />
      </button>
      <button
        type="button"
        onClick={() => onToggle(campaign)}
        className={`p-2 rounded-lg ${
          pausable
            ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
        }`}
        aria-label={pausable ? 'إيقاف' : 'تفعيل'}
        title={pausable ? 'إيقاف' : 'تفعيل'}
      >
        {pausable ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button
        type="button"
        onClick={() => onDelete(campaign)}
        className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
        aria-label="حذف"
        title="حذف"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function CampaignsPage() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { search, setSearch, page, setPage, withExtra } = useListParams();
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();

  const listParams = withExtra(statusFilter ? { status: statusFilter } : {});
  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', listParams],
    queryFn: () => campaignsApi.list(listParams),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['campaigns'] });

  const saveMutation = useMutation({
    mutationFn: campaignsApi.save,
    onSuccess: (res) => {
      invalidate();
      setModalOpen(false);
      clearErrors();
      notifySuccess(res);
      // New campaign → go add its products
      if (!editing && res?.data?.id) navigate(`/admin/campaigns/${res.data.id}`);
      setEditing(null);
    },
    onError: (err) => {
      applyApiError(err);
      notifyError(err);
    },
  });

  const statusMutation = useMutation({
    mutationFn: campaignsApi.setStatus,
    onSuccess: (res) => {
      invalidate();
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const deleteMutation = useMutation({
    mutationFn: campaignsApi.remove,
    onSuccess: (res) => {
      invalidate();
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const campaigns = data?.data || [];

  const openCreate = () => {
    setEditing(null);
    clearErrors();
    setModalOpen(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    clearErrors();
    setModalOpen(true);
  };
  const handleToggle = (c) =>
    statusMutation.mutate({ id: c.id, status: canPause(c) ? 'paused' : 'published' });
  const handleDelete = async (c) => {
    const ok = await confirm({
      title: 'حذف الحملة',
      message: `هل أنت متأكد من حذف الحملة «${c.name_ar}»؟ لن تتأثر المنتجات أو الطلبات السابقة.`,
      confirmText: 'حذف',
      variant: 'danger',
    });
    if (ok) deleteMutation.mutate(c.id);
  };

  const actions = { onEdit: openEdit, onToggle: handleToggle, onDelete: handleDelete };

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">حملات التخفيضات</h1>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث باسم الحملة أو الرابط..." />
          <select
            className="input w-full sm:w-auto sm:min-w-[10rem]"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="تصفية حسب الحالة"
          >
            {CAMPAIGN_STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={openCreate} className="btn-primary w-full sm:w-auto">
            <Plus size={18} /> إنشاء حملة
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : campaigns.length === 0 ? (
        <EmptyState message="لا توجد حملات — أنشئ أول حملة تخفيضات" />
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="md:hidden space-y-3">
            {campaigns.map((c) => (
              <article key={c.id} className="card p-3 flex gap-3 items-start">
                <div className="shrink-0">
                  <ImagePreview url={c.banner_image} size="md" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-sm leading-snug line-clamp-2">{c.name_ar}</h2>
                      <span dir="ltr" className="text-xs text-gray-500 text-right block truncate">/campaigns/{c.slug}</span>
                    </div>
                    <CampaignStatusBadge status={c.computed_status} />
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <div>
                      <dt className="text-gray-400">البداية</dt>
                      <dd className="font-medium">{formatDateTime(c.starts_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">النهاية</dt>
                      <dd className="font-medium">{formatDateTime(c.ends_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">المنتجات</dt>
                      <dd className="font-medium">{c.products_count ?? 0}</dd>
                    </div>
                  </dl>
                  <div className="mt-2 flex justify-end">
                    <CampaignActions campaign={c} {...actions} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Tablet / desktop: table */}
          <div className="hidden md:block">
            <TableScroll>
              <table className="admin-table sticky-cols">
                <thead>
                  <tr>
                    <th>الحملة</th>
                    <th>عدد المنتجات</th>
                    <th>البداية</th>
                    <th>النهاية</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/admin/campaigns/${c.id}`} className="font-medium hover:text-primary-600 block max-w-[16rem] truncate">
                          {c.name_ar}
                        </Link>
                        <span dir="ltr" className="text-xs text-gray-500 text-right block truncate max-w-[16rem]">/campaigns/{c.slug}</span>
                      </td>
                      <td>{c.products_count ?? 0}</td>
                      <td className="whitespace-nowrap">{formatDateTime(c.starts_at)}</td>
                      <td className="whitespace-nowrap">{formatDateTime(c.ends_at)}</td>
                      <td>
                        <CampaignStatusBadge status={c.computed_status} />
                      </td>
                      <td>
                        <CampaignActions campaign={c} {...actions} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </div>

          <Pagination pagination={data?.pagination} page={page} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          clearErrors();
        }}
        title={editing ? 'تعديل حملة' : 'إنشاء حملة'}
        size="lg"
        alert={formError}
      >
        <CampaignForm
          initial={editing}
          loading={saveMutation.isPending}
          getFieldError={getFieldError}
          onSubmit={(payload) => saveMutation.mutate({ id: editing?.id, data: payload })}
        />
      </Modal>
    </div>
  );
}
