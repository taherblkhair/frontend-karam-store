import { useId, useState } from 'react';
import { ChevronDown, Package, SearchCheck } from 'lucide-react';

const SECTIONS = [
  {
    id: 'delivery',
    title: 'تفاصيل التوصيل',
    icon: Package,
    emoji: '🚚',
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
    emoji: '🔍',
    highlighted: true,
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
    <div
      className={
        section.highlighted
          ? 'rounded-xl border border-primary-200/80 bg-primary-50/50 dark:border-primary-800/50 dark:bg-primary-950/25'
          : 'border-b border-ink-100 dark:border-gray-700 last:border-b-0'
      }
    >
      <button
        type="button"
        id={headerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onToggle(section.id)}
        className={`flex w-full items-center gap-2.5 text-start transition ${
          section.highlighted
            ? 'px-3.5 py-3.5 sm:px-4'
            : 'py-3.5 sm:py-4'
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${
            section.highlighted
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200'
              : 'bg-tertiary-100 text-ink-600 dark:bg-ink-800 dark:text-gray-300'
          }`}
          aria-hidden
        >
          <span className="sm:hidden">{section.emoji}</span>
          <Icon size={16} className="hidden sm:block" strokeWidth={2} />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={`text-sm sm:text-[0.9375rem] font-semibold leading-snug ${
              section.highlighted
                ? 'text-primary-900 dark:text-primary-100'
                : 'text-ink-800 dark:text-gray-100'
            }`}
          >
            {section.title}
          </span>
          {section.highlighted && !isOpen && (
            <span className="text-[11px] sm:text-xs font-medium text-primary-700/90 dark:text-primary-300/90 leading-snug">
              معاينة المنتج عند الاستلام قبل التأكيد
            </span>
          )}
        </span>

        <ChevronDown
          size={18}
          strokeWidth={2}
          className={`shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          } ${
            section.highlighted
              ? 'text-primary-600 dark:text-primary-300'
              : 'text-ink-400'
          }`}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!isOpen}
        className={section.highlighted ? 'px-3.5 pb-3.5 sm:px-4 sm:pb-4' : 'pb-3.5 sm:pb-4'}
      >
        <ul className="space-y-2 pe-1 ps-10 sm:ps-11">
          {section.items.map((text) => (
            <li
              key={text}
              className="relative text-[13px] sm:text-sm leading-relaxed text-ink-600 dark:text-gray-300"
            >
              <span
                className={`absolute top-[0.55em] -start-4 h-1 w-1 rounded-full ${
                  section.highlighted ? 'bg-primary-500' : 'bg-ink-300 dark:bg-gray-500'
                }`}
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
  // Inspection open by default — key trust message
  const [open, setOpen] = useState('inspection');

  const onToggle = (id) => {
    setOpen((prev) => (prev === id ? null : id));
  };

  return (
    <div
      className={`mt-5 sm:mt-6 border-t border-ink-100 dark:border-gray-700 pt-1 ${className}`}
      dir="rtl"
    >
      {SECTIONS.map((section) =>
        section.highlighted ? (
          <div key={section.id} className="my-2.5">
            <AccordionItem section={section} open={open} onToggle={onToggle} />
          </div>
        ) : (
          <AccordionItem key={section.id} section={section} open={open} onToggle={onToggle} />
        )
      )}
    </div>
  );
}
