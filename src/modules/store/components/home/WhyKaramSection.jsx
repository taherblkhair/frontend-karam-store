import { Link } from 'react-router-dom';
import { Eye, Truck, Wallet, PackageSearch, RotateCcw } from 'lucide-react';
import { POLICY_PAGES } from '@modules/store/utils/policies';

/**
 * Only promises the store actually keeps, each backed by a working feature:
 * - inspection: every Darb Al-Sabil shipment is created with allowInspection / allowTesting
 * - delivery: shipping price per Libyan city, shown at checkout before confirming
 * - payment: cash on delivery always; bank transfer only when enabled with an active account
 * - tracking: the public /track-order page
 * - returns: only when the owner has published a returns policy
 */
export function WhyKaramSection({ brand, settings = {} }) {
  const bankOn =
    settings.bank_transfer_enabled &&
    (settings.bank_accounts || []).some((a) => a.is_active !== false && a.bank_name && a.account_number);
  const returnsPolicy = POLICY_PAGES.find((p) => p.slug === 'returns');
  const hasReturns = Boolean(String(settings[returnsPolicy.key] || '').trim());

  const items = [
    { icon: Eye, title: 'معاينة قبل الاستلام', text: 'افحص طلبك وجرّبه عند وصول المندوب قبل أن تستلمه.' },
    { icon: Truck, title: 'توصيل لمدن ليبيا', text: 'سعر التوصيل لمدينتك يظهر قبل تأكيد الطلب، بلا مفاجآت.' },
    {
      icon: Wallet,
      title: bankOn ? 'الدفع عند الاستلام أو بالتحويل' : 'الدفع عند الاستلام',
      text: bankOn ? 'ادفع نقداً للمندوب، أو حوّل لحسابنا المصرفي وأرفق الإيصال.' : 'لا تدفع شيئاً قبل أن يصلك طلبك.',
    },
    hasReturns
      ? { icon: RotateCcw, title: 'استبدال واسترجاع', text: 'اطّلع على سياسة الاستبدال والاسترجاع قبل الشراء.', to: returnsPolicy.path, cta: 'السياسة' }
      : { icon: PackageSearch, title: 'تتبّع طلبك', text: 'تابع حالة طلبك في أي وقت برقم الطلب أو رقم هاتفك.', to: '/track-order', cta: 'تتبع الطلب' },
  ];

  return (
    <section aria-labelledby="why-title" className="bg-white dark:bg-gray-900 border-y border-ink-100 dark:border-gray-800">
      <div className="container mx-auto px-4 py-12 sm:py-14">
        <h2 id="why-title" className="font-display text-xl sm:text-2xl md:text-[1.65rem] font-bold text-ink-800 tracking-tight text-center dark:text-white">
          لماذا {brand.ar}؟
        </h2>
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, text, to, cta }) => (
            <li key={title} className="text-center px-1">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                <Icon size={26} aria-hidden />
              </span>
              <h3 className="mt-3 font-bold text-sm sm:text-base text-ink-800 dark:text-gray-100">{title}</h3>
              <p className="mt-1 text-xs sm:text-sm text-ink-500 leading-relaxed">{text}</p>
              {to ? (
                <Link to={to} className="mt-2 inline-block text-xs sm:text-sm font-medium text-primary-600 underline underline-offset-4">
                  {cta}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default WhyKaramSection;
