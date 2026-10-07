import { useEffect, useRef, useState } from 'react';
import { ClipboardPaste, Loader2, Wand2, X, Zap } from 'lucide-react';

const PLACEHOLDER =
  'لصق النص الكامل هنا (مثال: الاسم، رقم الهاتف، والمدينة/العنوان في أسطر مختلفة)...';

/**
 * Collapsible "paste everything" box above the delivery form.
 * `onApply(text)` resolves to `true` when something was filled (the panel then closes).
 */
export default function QuickFillPanel({ onApply }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef(null);
  const canReadClipboard = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText);

  useEffect(() => {
    if (open) textareaRef.current?.focus({ preventScroll: true });
  }, [open]);

  const close = () => {
    setOpen(false);
    setText('');
  };

  const handleApply = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      if (await onApply(text)) close();
    } finally {
      setBusy(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText(clip);
      textareaRef.current?.focus();
    } catch {
      textareaRef.current?.focus();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mb-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-secondary-400 bg-secondary-50 px-3 py-2.5 text-start transition hover:border-primary-600 hover:bg-primary-50 dark:border-secondary-400/50 dark:bg-secondary-400/10 dark:hover:bg-primary-900/30"
        aria-expanded="false"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-secondary-400 shadow-sm transition group-hover:scale-105">
          <Zap size={18} fill="currentColor" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-primary-700 dark:text-primary-300">
            إدخال سريع للبيانات ⚡
          </span>
          <span className="block text-xs text-ink-500 dark:text-gray-400">
            الصق الاسم والهاتف والعنوان دفعة واحدة وسنعبّئ الحقول لك
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/60 p-3 dark:border-primary-800 dark:bg-primary-900/20">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-primary-700 dark:text-primary-300">
          <Zap size={16} className="text-secondary-500" fill="currentColor" />
          لصق البيانات تلقائياً
        </p>
        <button
          type="button"
          onClick={close}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-white hover:text-ink-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="إغلاق الإدخال السريع"
        >
          <X size={18} />
        </button>
      </div>
      <label htmlFor="checkout-quick-fill" className="sr-only">
        النص الكامل لبيانات التوصيل
      </label>
      <textarea
        id="checkout-quick-fill"
        ref={textareaRef}
        rows={4}
        className="input min-h-[7rem] resize-y bg-white text-sm leading-relaxed dark:bg-gray-800"
        placeholder={PLACEHOLDER}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleApply();
          }
          if (e.key === 'Escape') close();
        }}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleApply}
          disabled={!text.trim() || busy}
          className="btn-primary flex-1 gap-2 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          {busy ? 'جاري المعالجة...' : 'معالجة وتعبئة البيانات'}
        </button>
        {canReadClipboard && (
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="btn-outline gap-1.5 px-3 py-2.5 text-sm"
          >
            <ClipboardPaste size={16} />
            لصق
          </button>
        )}
      </div>
    </div>
  );
}
