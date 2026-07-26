import { AlertTriangle } from 'lucide-react';

const VARIANT_STYLES = {
  danger: {
    icon: 'bg-red-100 text-red-600 dark:bg-red-900/30',
    button: 'btn-danger',
  },
  warning: {
    icon: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30',
    button: 'btn-primary bg-orange-600 hover:bg-orange-700',
  },
  default: {
    icon: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30',
    button: 'btn-primary',
  },
};

/**
 * Shared confirmation modal for sensitive actions.
 */
export function ConfirmDialog({
  open,
  title = 'تأكيد العملية',
  message = 'هل أنت متأكد؟',
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.default;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${styles.icon}`}>
              <AlertTriangle size={22} />
            </div>
            <div className="min-w-0">
              <h2 id="confirm-title" className="text-lg font-bold mb-1">{title}</h2>
              <p id="confirm-message" className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-6 justify-end">
            <button
              type="button"
              className="btn-outline"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'جاري التنفيذ...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
