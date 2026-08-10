import { useId, useState } from 'react';
import { ChevronDown, Package, SearchCheck } from 'lucide-react';

const SECTIONS = [
  {
    id: 'delivery',
    title: 'تفاصيل التوصيل',
    icon: Package,
    items: [
      'توصيل فوري داخل مدينة طرابلس.',
      'مدن المنطقة الوسطى والغربية: خلال يومين.',
      'المناطق والمدن الشرقية والجنوبية: خلال 3 أيام.',
      'يتم التواصل مع العميل لتأكيد تفاصيل الطلب وموعد التوصيل.',
    ],
  },
  {
    id: 'inspection',
    title: 'الفحص والمعاينة',
    icon: SearchCheck,
    items: [
      'مسموح للعميل بفحص ومعاينة الحقيبة عند الاستلام قبل إتمام الاستلام.',
    ],
  },
];

function AccordionItem({ section, open, onToggle }) {
  const panelId = useId();
  const headerId = useId();
  const Icon = section.icon;
  const isOpen = open === section.id;

  return (
    <div className="border-b border-ink-100 dark:border-gray-700 last:border-b-0">
      <button
        type="button"
        id={headerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onToggle(section.id)}
        className="flex w-full items-center gap-2.5 py-3.5 sm:py-4 text-start transition"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tertiary-100 text-ink-600 dark:bg-ink-800 dark:text-gray-300"
          aria-hidden
        >
          <Icon size={16} strokeWidth={2} />
        </span>

        <span className="min-w-0 flex-1 text-sm sm:text-[0.9375rem] font-semibold leading-snug text-ink-800 dark:text-gray-100">
          {section.title}
        </span>

        <ChevronDown
          size={18}
          strokeWidth={2}
          className={`shrink-0 text-ink-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!isOpen}
        className="pb-3.5 sm:pb-4"
      >
        <ul className="space-y-2 pe-1 ps-10 sm:ps-11">
          {section.items.map((text) => (
            <li
              key={text}
              className="relative text-[13px] sm:text-sm leading-relaxed text-ink-600 dark:text-gray-300"
            >
              <span
                className="absolute top-[0.55em] -start-4 h-1 w-1 rounded-full bg-ink-300 dark:bg-gray-500"
                aria-hidden
              />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Product trust & shipping info — placed under cart CTAs on the detail page.
 */
export function ProductDetailAccordions({ className = '' }) {
  const [open, setOpen] = useState(null);

  const onToggle = (id) => {
    setOpen((prev) => (prev === id ? null : id));
  };

  return (
    <div
      className={`mt-5 sm:mt-6 border-t border-ink-100 dark:border-gray-700 pt-1 ${className}`}
      dir="rtl"
    >
      {SECTIONS.map((section) => (
        <AccordionItem key={section.id} section={section} open={open} onToggle={onToggle} />
      ))}
    </div>
  );
}
