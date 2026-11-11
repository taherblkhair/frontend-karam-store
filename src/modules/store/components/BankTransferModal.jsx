import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Upload, X } from 'lucide-react';
import { Modal, FieldError } from '@shared/ui';
import { formatPrice } from '@core/constants';
import { notifyError } from '@shared/services/toast.service';
import { CopyButton } from '@modules/store/components/CopyButton';

const STEPS = 3;
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

/** Arabic or Latin digits, one decimal separator → number (NaN when not a number). */
function parseAmount(value) {
  const ascii = String(value || '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[٫,]/g, '.')
    .trim();
  return ascii ? Number(ascii) : NaN;
}

function AccountRow({ label, value, copyLabel }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm min-w-0">
        <span className="text-ink-500">{label}: </span>
        <span dir="ltr" className="font-medium tabular-nums break-all">{value}</span>
      </p>
      <CopyButton
        text={value}
        label={copyLabel}
        copiedLabel="تم النسخ"
        hideLabel
        className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-tertiary-200 dark:text-gray-300 dark:hover:bg-gray-700"
      />
    </div>
  );
}

/**
 * Bank transfer, 3 steps: account details → transfer details + receipt → review and send.
 * The order itself is sent by the checkout page (onSubmit), so delivery data is checked once.
 */
export function BankTransferModal({ open, onClose, accounts, total, items, submitting, getFieldError, onSubmit }) {
  const [step, setStep] = useState(1);
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [errors, setErrors] = useState({});
  const inputRef = useRef(null);

  const account = accounts.find((a) => a.id === accountId) || accounts[0];

  useEffect(() => {
    if (open) {
      setStep(1);
      setErrors({});
      if (!accounts.some((a) => a.id === accountId)) setAccountId(accounts[0]?.id || '');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // A server error on a step-2 field sends the customer back to that step
  useEffect(() => {
    if (['bank_account_id', 'transfer_amount', 'receipt'].some((f) => getFieldError(f))) setStep(2);
  }, [getFieldError]);

  const previewUrl = useMemo(
    () => (receipt && receipt.type.startsWith('image/') ? URL.createObjectURL(receipt) : null),
    [receipt]
  );
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const errorFor = (field) => errors[field] || getFieldError(field);
  const amountValue = parseAmount(amount);
  const amountDiffers = Number.isFinite(amountValue) && Math.abs(amountValue - total) >= 0.01;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const pickFile = (file) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    let message = '';
    if (!RECEIPT_TYPES.includes(file.type)) message = 'ارفع صورة (JPG أو PNG أو WEBP) أو ملف PDF';
    else if (file.size > MAX_RECEIPT_BYTES) message = 'حجم الإيصال كبير — الحد الأقصى 5 ميغابايت';
    if (message) {
      setErrors((prev) => ({ ...prev, receipt: message }));
      notifyError({ message });
      return;
    }
    setReceipt(file);
    setErrors((prev) => ({ ...prev, receipt: '' }));
  };

  const goReview = () => {
    const next = {};
    if (!account) next.bank_account_id = 'اختر المصرف الذي حوّلت إليه';
    if (!Number.isFinite(amountValue) || amountValue <= 0) next.transfer_amount = 'اكتب المبلغ المحوَّل كما في الإيصال';
    if (!receipt) next.receipt = 'أرفق صورة إيصال التحويل';
    setErrors(next);
    const first = Object.values(next)[0];
    if (first) return notifyError({ message: first });
    setStep(3);
  };

  const send = () => onSubmit({ bank_account_id: account.id, transfer_amount: amountValue, receipt });

  // Portal: the store's fixed bottom bar (same z-index, later in the page) would cover the buttons
  return createPortal(
    <Modal open={open} onClose={submitting ? () => {} : onClose} title="تحويل مصرفي">
      <p className="text-sm text-ink-500">الخطوة {step} من {STEPS}</p>

      {step === 1 && account && (
        <div className="mt-2 space-y-5">
          <h3 className="text-lg font-bold">حوّل المبلغ إلى حسابنا المصرفي</h3>
          <ol className="list-decimal ps-5 space-y-2 text-sm text-ink-700 dark:text-gray-200">
            <li>حوّل أو أودِع مبلغ <span className="font-bold text-primary-600">{formatPrice(total)}</span> في الحساب المصرفي أدناه.</li>
            <li>احتفظ بصورة واضحة من الإيصال.</li>
            <li>اضغط «التالي» وأخبرنا بالمصرف والمبلغ وأرفق الإيصال.</li>
          </ol>
          <div className="space-y-3">
            {accounts.map((a) => (
              <div key={a.id} className="space-y-3">
                {a.account_name ? (
                  <p className="text-sm">
                    <span className="font-medium">اسم الحساب: </span>
                    <span className="text-ink-500">{a.account_name}</span>
                  </p>
                ) : null}
                <div className="rounded-2xl border border-ink-100 bg-tertiary-50 p-4 space-y-3 dark:border-gray-700 dark:bg-gray-900/30">
                  <p className="font-bold">{a.bank_name}</p>
                  <AccountRow label="رقم الحساب" value={a.account_number} copyLabel="نسخ رقم الحساب" />
                  {a.iban ? <AccountRow label="IBAN" value={a.iban} copyLabel="نسخ رقم IBAN" /> : null}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn-outline" onClick={onClose}>رجوع</button>
            <button type="button" className="btn-primary" onClick={() => setStep(2)}>حوّلت، التالي</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-2 space-y-5">
          <h3 className="text-lg font-bold">بيانات التحويل الذي قمت به</h3>

          <div>
            <span className="block text-sm font-medium mb-1.5">المصرف</span>
            {accounts.length > 1 ? (
              <div className="grid gap-2" role="radiogroup" aria-label="المصرف">
                {accounts.map((a) => (
                  <label
                    key={a.id}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 cursor-pointer text-sm ${
                      account?.id === a.id ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-ink-100 dark:border-gray-700'
                    }`}
                  >
                    <input type="radio" name="transfer-bank" checked={account?.id === a.id} onChange={() => setAccountId(a.id)} />
                    {a.bank_name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm">{account?.bank_name}</p>
            )}
            <FieldError message={errorFor('bank_account_id')} />
          </div>

          <div>
            <label htmlFor="transfer-amount" className="block text-sm font-medium mb-1.5">المبلغ المحوَّل</label>
            <div className="relative">
              <input
                id="transfer-amount"
                inputMode="decimal"
                className={`input pl-12 ${errorFor('transfer_amount') ? '!border-red-400 ring-2 ring-red-200 dark:ring-red-900/40' : ''}`}
                placeholder="اكتب المبلغ كما في الإيصال"
                aria-invalid={Boolean(errorFor('transfer_amount')) || undefined}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.transfer_amount) setErrors((prev) => ({ ...prev, transfer_amount: '' }));
                }}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-400 pointer-events-none">د.ل</span>
            </div>
            <p className="text-xs text-ink-500 mt-1">إجمالي الطلب: {formatPrice(total)}</p>
            <FieldError message={errorFor('transfer_amount')} />
          </div>

          <div>
            <span className="block text-sm font-medium mb-1.5">إيصال التحويل</span>
            <div
              className={`rounded-xl border border-dashed p-4 flex items-center gap-3 ${
                errorFor('receipt') ? 'border-red-400' : 'border-ink-200 dark:border-gray-600'
              }`}
            >
              {receipt ? (
                <>
                  {previewUrl ? (
                    <img src={previewUrl} alt="معاينة الإيصال" className="w-14 h-14 rounded-lg object-cover border border-ink-100 shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-tertiary-100 flex items-center justify-center shrink-0 dark:bg-gray-700">
                      <FileText size={22} className="text-ink-400" />
                    </div>
                  )}
                  <p className="flex-1 min-w-0 text-sm truncate" dir="ltr">{receipt.name}</p>
                  <button
                    type="button"
                    onClick={() => setReceipt(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-tertiary-200 hover:text-ink-700 dark:hover:bg-gray-700"
                    aria-label="إزالة الإيصال"
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                <>
                  <p className="flex-1 text-sm text-ink-500">صورة واضحة أو مستند PDF</p>
                  <button type="button" className="btn-outline text-sm px-4 py-2" onClick={() => inputRef.current?.click()}>
                    <Upload size={16} /> اختيار ملف
                  </button>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={RECEIPT_ACCEPT}
                className="hidden"
                aria-label="إيصال التحويل"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </div>
            <FieldError message={errorFor('receipt')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn-outline" onClick={() => setStep(1)}>رجوع</button>
            <button type="button" className="btn-primary" onClick={goReview}>التالي</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-2 space-y-5">
          <h3 className="text-lg font-bold">راجع طلبك قبل الإرسال</h3>
          <dl className="text-sm space-y-2.5 rounded-2xl border border-ink-100 p-4 dark:border-gray-700">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">المنتجات</dt>
              <dd className="font-medium">{itemCount} قطعة</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">إجمالي الطلب</dt>
              <dd className="font-bold text-primary-600">{formatPrice(total)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">المصرف</dt>
              <dd className="font-medium text-end">{account?.bank_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">المبلغ المحوَّل</dt>
              <dd className="font-medium">{formatPrice(amountValue)}</dd>
            </div>
            <div className="flex justify-between gap-4 items-center">
              <dt className="text-ink-500">الإيصال</dt>
              <dd className="min-w-0">
                {previewUrl ? (
                  <img src={previewUrl} alt="الإيصال" className="w-16 h-16 rounded-lg object-cover border border-ink-100" />
                ) : (
                  <span className="inline-flex items-center gap-1 text-ink-700 dark:text-gray-200"><FileText size={16} /> PDF</span>
                )}
              </dd>
            </div>
          </dl>
          {amountDiffers ? (
            <p className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
              المبلغ المحوَّل يختلف عن إجمالي الطلب. سنراجع الإيصال ونتواصل معك إن لزم.
            </p>
          ) : null}
          <p className="text-sm text-ink-500">سنراجع الإيصال ونؤكد طلبك بعد التحقق من وصول المبلغ.</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn-outline" onClick={() => setStep(2)} disabled={submitting}>رجوع</button>
            <button type="button" className="btn-primary" onClick={send} disabled={submitting}>
              {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </button>
          </div>
        </div>
      )}
    </Modal>,
    document.body
  );
}

export default BankTransferModal;
