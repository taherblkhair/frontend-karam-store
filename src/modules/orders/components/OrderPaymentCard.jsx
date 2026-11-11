import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, FileText } from 'lucide-react';
import { Modal, FieldError } from '@shared/ui';
import { formatPrice } from '@core/constants';
import { useConfirm } from '@shared/hooks/useConfirm';
import { ordersApi } from '@modules/orders/api/orders.api';

const PROOF_STATUS = {
  pending: { label: 'بانتظار المراجعة', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  approved: { label: 'تم قبول الإيصال', tone: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
  rejected: { label: 'تم رفض الإيصال', tone: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
};

const PAYMENT_STATUS = { pending: 'غير مدفوع', paid: 'مدفوع', refunded: 'مُسترد' };

/** The private receipt is fetched with the staff token and shown from memory (never a public URL). */
function useReceipt(orderId, enabled) {
  const [state, setState] = useState({ url: null, mime: '', error: '' });
  useEffect(() => {
    if (!enabled) return undefined;
    let url = null;
    let cancelled = false;
    ordersApi
      .getPaymentReceipt(orderId)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setState({ url, mime: blob.type, error: '' });
      })
      .catch((err) => !cancelled && setState({ url: null, mime: '', error: err.message || 'تعذر تحميل الإيصال' }));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [orderId, enabled]);
  return state;
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-500 shrink-0">{label}</span>
      <span className="font-medium text-end min-w-0 break-words">{children}</span>
    </div>
  );
}

export function OrderPaymentCard({ order, reviewMutation, canReview }) {
  const confirm = useConfirm();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const proof = order.payment_proof;
  const isTransfer = order.payment_method === 'bank_transfer';
  const receipt = useReceipt(order.id, Boolean(isTransfer && proof));
  const reviewable = canReview && proof && !['cancelled', 'returned'].includes(order.status);
  const status = PROOF_STATUS[proof?.status] || PROOF_STATUS.pending;

  const approve = async () => {
    const ok = await confirm({
      title: 'قبول إيصال التحويل',
      message: `تأكدت من وصول ${formatPrice(proof.declared_amount)} إلى حساب ${proof.bank_name}؟ سيُسجَّل الطلب مدفوعاً.`,
      confirmText: 'قبول',
    });
    if (ok) reviewMutation.mutate({ decision: 'approve' });
  };

  const submitReject = (e) => {
    e.preventDefault();
    if (!note.trim()) return setNoteError('اكتب سبب رفض الإيصال');
    reviewMutation.mutate(
      { decision: 'reject', note: note.trim() },
      { onSuccess: () => { setRejectOpen(false); setNote(''); } }
    );
  };

  if (!isTransfer) {
    return (
      <div className="text-sm space-y-2">
        <Row label="طريقة الدفع">الدفع عند الاستلام</Row>
        <Row label="حالة الدفع">{PAYMENT_STATUS[order.payment_status] || order.payment_status}</Row>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">تحويل مصرفي</span>
        <span className={`badge ${status.tone}`}>{status.label}</span>
      </div>

      {proof ? (
        <>
          <div className="space-y-2">
            <Row label="المصرف">{proof.bank_name}</Row>
            {proof.account_number ? <Row label="رقم الحساب"><span dir="ltr" className="tabular-nums">{proof.account_number}</span></Row> : null}
            <Row label="المبلغ المحوَّل">{formatPrice(proof.declared_amount)}</Row>
            <Row label="حالة الدفع">{PAYMENT_STATUS[order.payment_status] || order.payment_status}</Row>
          </div>
          {!proof.amount_matches ? (
            <p className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
              المبلغ المحوَّل يختلف عن إجمالي الطلب ({formatPrice(order.total)})
            </p>
          ) : null}

          <div>
            <p className="text-ink-500 mb-1.5">الإيصال</p>
            {receipt.error ? (
              <p className="text-red-600">{receipt.error}</p>
            ) : !receipt.url ? (
              <p className="text-ink-400">جاري تحميل الإيصال...</p>
            ) : receipt.mime.startsWith('image/') ? (
              <a href={receipt.url} target="_blank" rel="noopener noreferrer" className="block" title="فتح الإيصال بالحجم الكامل">
                <img src={receipt.url} alt="إيصال التحويل" className="w-full max-h-72 object-contain rounded-xl border border-ink-100 bg-tertiary-100 dark:border-gray-700 dark:bg-gray-900/30" />
              </a>
            ) : (
              <a href={receipt.url} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm w-full">
                <FileText size={16} /> فتح الإيصال (PDF) <ExternalLink size={14} />
              </a>
            )}
          </div>

          {proof.reviewed_at ? (
            <p className="text-xs text-ink-500">
              {proof.status === 'approved' ? 'قبله' : 'رفضه'} {proof.reviewer_name || 'موظف'} —{' '}
              {new Date(proof.reviewed_at).toLocaleString('ar-LY')}
              {proof.review_note ? ` — ${proof.review_note}` : ''}
            </p>
          ) : null}

          {reviewable ? (
            <div className="grid grid-cols-2 gap-2">
              {proof.status !== 'approved' ? (
                <button type="button" className="btn-primary text-sm" disabled={reviewMutation.isPending} onClick={approve}>
                  قبول الإيصال
                </button>
              ) : null}
              {proof.status !== 'rejected' ? (
                <button
                  type="button"
                  className="btn-outline text-sm text-red-600"
                  disabled={reviewMutation.isPending}
                  onClick={() => { setNoteError(''); setRejectOpen(true); }}
                >
                  رفض الإيصال
                </button>
              ) : null}
            </div>
          ) : null}
          {proof.status !== 'approved' && !['cancelled', 'returned'].includes(order.status) ? (
            <p className="text-xs text-ink-500">لن تُنشأ شحنة درب السبيل لهذا الطلب قبل قبول الإيصال.</p>
          ) : null}
        </>
      ) : (
        <p className="text-ink-500">لا يوجد إيصال مرفق.</p>
      )}

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="رفض إيصال التحويل">
        <form onSubmit={submitReject} className="space-y-4">
          <p className="text-sm text-gray-500">يبقى الطلب غير مدفوع، ويُسجَّل السبب في ملاحظات الطلب. تواصل مع العميل لإرسال إيصال صحيح.</p>
          <div>
            <label htmlFor="reject-note" className="block text-sm font-medium mb-1.5">السبب *</label>
            <textarea
              id="reject-note"
              className="input"
              rows={2}
              maxLength={500}
              placeholder="مثال: المبلغ لم يصل إلى الحساب"
              value={note}
              onChange={(e) => { setNote(e.target.value); setNoteError(''); }}
            />
            <FieldError message={noteError} />
          </div>
          <button type="submit" disabled={reviewMutation.isPending} className="btn-danger w-full">
            {reviewMutation.isPending ? 'جاري الحفظ...' : 'رفض الإيصال'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

export default OrderPaymentCard;
