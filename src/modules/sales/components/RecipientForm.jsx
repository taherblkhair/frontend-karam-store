import { CheckCircle2, Loader2, MapPin, Phone, RotateCcw, User, UserCheck, X } from 'lucide-react';
import { notifyError, notifySuccess, notifyWarning } from '@shared/services/toast.service';
import { FieldError } from '@shared/ui';
import { SearchableSelect } from '@modules/store/components/SearchableSelect';
import QuickFillPanel from '@modules/store/components/QuickFillPanel';

const errorRing = '!border-red-400 ring-2 ring-red-200 dark:ring-red-900/40';

function Label({ htmlFor, children, required, optional }) {
  const Tag = htmlFor ? 'label' : 'span';
  return (
    <Tag htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
      {children}
      {required && <span className="text-red-500"> *</span>}
      {optional && <span className="font-normal text-gray-400"> (اختياري)</span>}
    </Tag>
  );
}

/** Recipient block of the POS sheet; all state lives in `usePosRecipient`. */
export function RecipientForm({ form }) {
  const {
    recipient,
    update,
    error,
    refs,
    phoneValid,
    cityOptions,
    areaOptions,
    areasLoading,
    customerSuggestion,
    customerLoading,
    applyCustomer,
    dismissCustomer,
    quickFill,
    focusField,
    reset,
    isDirty,
  } = form;
  const errorFor = (field) => (error?.field === field ? error.message : '');

  const handleQuickFill = async (text) => {
    const result = await quickFill(text);
    if (!result) {
      notifyError({ message: 'تعذر التعرف على البيانات. اكتب الاسم والهاتف والعنوان كلٌ في سطر' });
      return false;
    }
    if (result.missing.length === 0) {
      notifySuccess({ message: 'تمت تعبئة البيانات بنجاح! يرجى التأكد من صحتها' });
    } else {
      notifyWarning(`تمت تعبئة ما تم التعرف عليه. يرجى إكمال: ${result.missing.join('، ')}`);
      const first = { 'رقم الهاتف': 'phone', الاسم: 'name', المدينة: 'city_id' }[result.missing[0]];
      requestAnimationFrame(() => focusField(first));
    }
    return true;
  };

  return (
    <section aria-labelledby="pos-recipient-title" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="pos-recipient-title" className="flex items-center gap-1.5 text-sm font-bold">
          <User size={16} className="text-primary-600 dark:text-primary-300" />
          بيانات المستلم
        </h3>
        {isDirty && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <RotateCcw size={13} />
            مسح البيانات
          </button>
        )}
      </div>

      <QuickFillPanel onApply={handleQuickFill} />

      <div>
        <Label htmlFor="pos-phone" required>رقم الهاتف</Label>
        <div className="relative">
          <Phone size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="pos-phone"
            ref={refs.phone}
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            dir="ltr"
            className={`input h-11 pr-9 pl-16 text-right tabular-nums tracking-wide ${
              errorFor('phone') ? errorRing : phoneValid ? '!border-primary-500' : ''
            }`}
            placeholder="09XXXXXXXX"
            aria-required="true"
            aria-invalid={Boolean(errorFor('phone')) || undefined}
            value={recipient.phone}
            onChange={(e) => update('phone', e.target.value)}
          />
          <div className="absolute inset-y-0 left-1.5 flex items-center gap-0.5">
            {customerLoading ? (
              <Loader2 size={16} className="animate-spin text-gray-400" aria-label="جاري البحث عن العميل" />
            ) : phoneValid ? (
              <CheckCircle2 size={18} className="text-primary-600 dark:text-primary-300" aria-label="رقم صحيح" />
            ) : null}
            {recipient.phone && (
              <button
                type="button"
                onClick={() => {
                  update('phone', '');
                  refs.phone.current?.focus();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                aria-label="مسح رقم الهاتف"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        {errorFor('phone') ? (
          <FieldError message={errorFor('phone')} />
        ) : (
          <p className="mt-1 text-[11px] text-gray-500">
            {phoneValid ? 'رقم صحيح' : '10 أرقام تبدأ بـ 091 · 092 · 093 · 094 · 095'}
          </p>
        )}

        {customerSuggestion && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 p-2 text-xs dark:border-primary-800 dark:bg-primary-900/20">
            <UserCheck size={18} className="shrink-0 text-primary-600 dark:text-primary-300" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-primary-800 dark:text-primary-200">
                عميل سابق: {customerSuggestion.name}
              </p>
              <p className="truncate text-gray-500 dark:text-gray-400">
                {customerSuggestion.total_orders ? `${customerSuggestion.total_orders} طلب سابق` : 'مسجّل في العملاء'}
                {customerSuggestion.address ? ` · ${customerSuggestion.address}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => applyCustomer(customerSuggestion)}
              className="btn-primary shrink-0 px-3 py-1.5 text-xs"
            >
              تعبئة
            </button>
            <button
              type="button"
              onClick={dismissCustomer}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-white hover:text-gray-700 dark:hover:bg-gray-700"
              aria-label="تجاهل"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="pos-name" optional>اسم المستلم</Label>
        <input
          id="pos-name"
          ref={refs.name}
          className="input h-11"
          placeholder="مثال: محمد أحمد"
          autoComplete="off"
          value={recipient.name}
          onChange={(e) => update('name', e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-dashed border-gray-200 p-3 dark:border-gray-700">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          <MapPin size={13} />
          التوصيل (اختياري — اتركه فارغاً للاستلام من المحل)
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div>
            <Label>المدينة</Label>
            <SearchableSelect
              ref={refs.city_id}
              options={cityOptions}
              value={recipient.city_id}
              onChange={(v) => update('city_id', v)}
              placeholder="اختر المدينة"
              searchPlaceholder="ابحث عن المدينة"
              emptyText="لا توجد مدينة مطابقة"
            />
          </div>
          <div>
            <Label>المنطقة</Label>
            <SearchableSelect
              ref={refs.area_id}
              options={areaOptions}
              value={recipient.area_id}
              onChange={(v) => update('area_id', v)}
              placeholder={
                !recipient.city_id
                  ? 'اختر المدينة أولاً'
                  : areasLoading
                    ? 'جاري التحميل...'
                    : areaOptions.length
                      ? 'اختر المنطقة'
                      : 'لا توجد مناطق'
              }
              searchPlaceholder="ابحث عن المنطقة"
              emptyText="لا توجد منطقة مطابقة"
              disabled={!recipient.city_id || areasLoading || areaOptions.length === 0}
            />
          </div>
        </div>
        <div className="mt-2">
          <Label htmlFor="pos-address">العنوان التفصيلي</Label>
          <textarea
            id="pos-address"
            rows={2}
            className="input resize-none text-sm"
            placeholder="مثال: قرب جامع ...، الشارع، رقم المبنى"
            value={recipient.address}
            onChange={(e) => update('address', e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}
