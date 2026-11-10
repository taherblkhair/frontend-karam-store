import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Copy, Check, Edit, ExternalLink, Pause, Play, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { resolveMediaUrl } from '@core/api/config.js';
import { formatPrice } from '@core/constants';
import { notifyError, notifySuccess } from '@shared/services/toast.service';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { useConfirm } from '@shared/hooks/useConfirm';
import { LoadingSpinner, Modal, EmptyState } from '@shared/ui';
import { TableScroll } from '@shared/components/TableScroll';
import { ImagePreview } from '@shared/components/ImageUpload';
import { campaignsApi } from '@modules/campaigns/api/campaigns.api';
import { CampaignForm } from '@modules/campaigns/components/CampaignForm';
import { CampaignStatusBadge } from '@modules/campaigns/components/CampaignStatusBadge';
import { AddCampaignProductsModal } from '@modules/campaigns/components/AddCampaignProductsModal';
import {
  campaignAbsoluteUrl,
  campaignPath,
  discountPercent,
  formatDateTime,
} from '@modules/campaigns/utils/campaign';

/** Inline campaign-price editor: saves on Enter or blur when the value changed. */
function CampaignPriceInput({ item, onSave, saving }) {
  const [value, setValue] = useState(String(Number(item.campaign_price)));
  useEffect(() => setValue(String(Number(item.campaign_price))), [item.campaign_price]);

  const original = Number(item.original_price);
  const num = Number(value);
  const valid = num > 0 && num < original;
  const changed = num !== Number(item.campaign_price);

  const commit = () => {
    if (!changed) return;
    if (!valid) {
      notifyError({ message: 'سعر الحملة يجب أن يكون أكبر من صفر وأقل من السعر الأصلي' });
      setValue(String(Number(item.campaign_price)));
      return;
    }
    onSave(item.product_id, num);
  };

  return (
    <input
      className={`input w-28 py-1.5 ${!valid ? 'border-red-400' : ''}`}
      type="number"
      min={0.01}
      step="0.01"
      value={value}
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
      }}
      aria-label={`سعر الحملة لـ ${item.name_ar}`}
    />
  );
}

function ItemWarning({ item }) {
  if (!item.is_sellable) {
    return <span className="text-xs text-amber-600 inline-flex items-center gap-1"><AlertTriangle size={12} /> المنتج غير معروض</span>;
  }
  if (!item.price_valid) {
    return <span className="text-xs text-red-500 inline-flex items-center gap-1"><AlertTriangle size={12} /> سعر الحملة لم يعد أقل من الأصلي — لا يُطبَّق</span>;
  }
  return null;
}

export default function CampaignDetailPage() {
  const { id } = useParams();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const editErrors = useFormErrors();
  const addErrors = useFormErrors();

  const queryKey = ['campaign', id];
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => campaignsApi.get(id) });
  const campaign = data?.data;

  const onUpdated = (res) => {
    queryClient.setQueryData(queryKey, res);
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    notifySuccess(res);
  };

  const saveMutation = useMutation({
    mutationFn: campaignsApi.save,
    onSuccess: (res) => {
      onUpdated(res);
      setEditOpen(false);
      editErrors.clearErrors();
    },
    onError: (err) => {
      editErrors.applyApiError(err);
      notifyError(err);
    },
  });
  const statusMutation = useMutation({ mutationFn: campaignsApi.setStatus, onSuccess: onUpdated, onError: notifyError });
  const addMutation = useMutation({
    mutationFn: campaignsApi.addProducts,
    onSuccess: (res) => {
      onUpdated(res);
      setAddOpen(false);
      addErrors.clearErrors();
    },
    onError: (err) => {
      addErrors.applyApiError(err);
      notifyError(err);
    },
  });
  const priceMutation = useMutation({ mutationFn: campaignsApi.updateProductPrice, onSuccess: onUpdated, onError: notifyError });
  const removeMutation = useMutation({ mutationFn: campaignsApi.removeProducts, onSuccess: onUpdated, onError: notifyError });

  if (isLoading) return <LoadingSpinner />;
  if (!campaign) return <EmptyState message="الحملة غير موجودة" />;

  const items = campaign.products || [];
  const pausable = campaign.status === 'published' && campaign.computed_status !== 'expired';
  const shareUrl = campaignAbsoluteUrl(campaign);
  const banner = resolveMediaUrl(campaign.banner_image);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notifyError({ message: 'تعذر نسخ الرابط' });
    }
  };

  const savePrice = (productId, price) =>
    priceMutation.mutate({ id: campaign.id, productId, campaign_price: price });

  const removeItem = async (item) => {
    const ok = await confirm({
      title: 'إزالة المنتج من الحملة',
      message: `إزالة «${item.name_ar}» من الحملة؟ يعود المنتج إلى سعره الطبيعي ولا يُحذف من المتجر.`,
      confirmText: 'إزالة',
      variant: 'danger',
    });
    if (ok) removeMutation.mutate({ id: campaign.id, productIds: [item.product_id] });
  };

  return (
    <div className="min-w-0">
      <Link to="/admin/campaigns" className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1 mb-2">
        <ArrowRight size={14} /> حملات التخفيضات
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold">{campaign.name_ar}</h1>
            <CampaignStatusBadge status={campaign.computed_status} />
          </div>
          {campaign.name_en ? <p className="text-sm text-gray-500 mt-1" dir="ltr">{campaign.name_en}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { editErrors.clearErrors(); setEditOpen(true); }} className="btn-outline text-sm">
            <Edit size={16} /> تعديل
          </button>
          <button
            type="button"
            onClick={() => statusMutation.mutate({ id: campaign.id, status: pausable ? 'paused' : 'published' })}
            disabled={statusMutation.isPending}
            className={pausable ? 'btn-outline text-sm text-amber-700' : 'btn-primary text-sm'}
          >
            {pausable ? <><Pause size={16} /> إيقاف</> : <><Play size={16} /> تفعيل</>}
          </button>
          <a
            href={`${campaignPath(campaign)}?preview=1`}
            target="_blank"
            rel="noreferrer"
            className="btn-outline text-sm"
          >
            <ExternalLink size={16} /> معاينة في المتجر
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <section className="card overflow-hidden lg:col-span-2">
          <div className="relative aspect-[16/6] bg-gray-200 dark:bg-gray-700">
            {banner ? (
              <img src={banner} alt={campaign.name_ar} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">لا توجد صورة غلاف</div>
            )}
          </div>
          <div className="p-3 sm:p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
              {campaign.description || 'لا يوجد وصف'}
            </p>
          </div>
        </section>

        <section className="card p-3 sm:p-4">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-400 text-xs">البداية</dt>
              <dd className="font-medium">{formatDateTime(campaign.starts_at)}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs">النهاية</dt>
              <dd className="font-medium">{formatDateTime(campaign.ends_at)}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs">المنتجات / أعلى خصم</dt>
              <dd className="font-medium">
                {items.length} منتج · حتى {campaign.max_discount_percent || 0}%
              </dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs">الشريط الإعلاني</dt>
              <dd className="font-medium">
                {campaign.show_in_announcement_bar ? `يظهر · الأولوية ${campaign.priority}` : 'لا يظهر'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs">رابط الحملة</dt>
              <dd className="flex items-center gap-2">
                <span dir="ltr" className="truncate text-primary-600 text-right flex-1">{shareUrl}</span>
                <button type="button" onClick={copyLink} className="text-gray-500 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="نسخ الرابط" title="نسخ الرابط">
                  {copied ? <Check size={16} className="text-primary-600" /> : <Copy size={16} />}
                </button>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <h2 className="text-lg font-bold">منتجات الحملة ({items.length})</h2>
        <button type="button" onClick={() => { addErrors.clearErrors(); setAddOpen(true); }} className="btn-primary w-full sm:w-auto">
          <Plus size={18} /> إضافة منتجات
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState message="لم تُضف منتجات بعد — أضف منتجات المتجر وحدد سعر التخفيض لكل منها" />
      ) : (
        <>
          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {items.map((item) => (
              <article key={item.id} className="card p-3 flex gap-3 items-start">
                <div className="shrink-0">
                  <ImagePreview url={item.primary_image} size="md" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm leading-snug line-clamp-2">{item.name_ar}</h3>
                      <span className="text-xs text-gray-500">{item.sku || '—'}</span>
                    </div>
                    <button type="button" onClick={() => removeItem(item)} className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" aria-label="إزالة من الحملة">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-gray-400 line-through">{formatPrice(item.original_price)}</span>
                    <CampaignPriceInput item={item} onSave={savePrice} saving={priceMutation.isPending} />
                    <span className="font-bold text-green-700 dark:text-green-300">-{discountPercent(item.original_price, item.campaign_price)}%</span>
                  </div>
                  <ItemWarning item={item} />
                </div>
              </article>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <TableScroll>
              <table className="admin-table sticky-cols">
                <thead>
                  <tr>
                    <th>صورة</th>
                    <th>المنتج</th>
                    <th>SKU</th>
                    <th>السعر السابق</th>
                    <th>سعر الحملة</th>
                    <th>نسبة الخصم</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <ImagePreview url={item.primary_image} />
                      </td>
                      <td>
                        <div className="font-medium max-w-[14rem] truncate">{item.name_ar}</div>
                        {item.category_name ? <span className="text-xs text-gray-500">{item.category_name}</span> : null}
                        <div><ItemWarning item={item} /></div>
                      </td>
                      <td className="whitespace-nowrap">{item.sku || '—'}</td>
                      <td className="whitespace-nowrap text-gray-500 line-through">{formatPrice(item.original_price)}</td>
                      <td>
                        <CampaignPriceInput item={item} onSave={savePrice} saving={priceMutation.isPending} />
                      </td>
                      <td className="whitespace-nowrap font-bold text-green-700 dark:text-green-300">
                        -{discountPercent(item.original_price, item.campaign_price)}%
                      </td>
                      <td>
                        <button type="button" onClick={() => removeItem(item)} className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" aria-label="إزالة من الحملة" title="إزالة من الحملة">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </div>
        </>
      )}

      <Modal
        open={editOpen}
        onClose={() => { setEditOpen(false); editErrors.clearErrors(); }}
        title="تعديل حملة"
        size="lg"
        alert={editErrors.formError}
      >
        <CampaignForm
          initial={campaign}
          loading={saveMutation.isPending}
          getFieldError={editErrors.getFieldError}
          onSubmit={(payload) => saveMutation.mutate({ id: campaign.id, data: payload })}
        />
      </Modal>

      <AddCampaignProductsModal
        open={addOpen}
        onClose={() => { setAddOpen(false); addErrors.clearErrors(); }}
        existingIds={items.map((i) => i.product_id)}
        loading={addMutation.isPending}
        formError={addErrors.formError}
        onSubmit={(newItems) => addMutation.mutate({ id: campaign.id, items: newItems })}
      />
    </div>
  );
}
