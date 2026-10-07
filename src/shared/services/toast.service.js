import toast from 'react-hot-toast';
import { getApiMessage, parseApiError, DEFAULT_ERROR_MESSAGE } from '@shared/utils/apiMessage.js';

/** Show API success message in a toast. */
export function notifySuccess(response, fallback = 'تم بنجاح') {
  const message = getApiMessage(response, fallback);
  if (message) toast.success(message);
}

export function notifyWarning(message, options = {}) {
  toast(message, { icon: '⚠️', duration: 5000, ...options });
}

export function dismissNotification(id) {
  toast.dismiss(id);
}

/**
 * Show API error message in a toast.
 * Prefer field-level UI via useFormErrors for validation; toast covers general errors.
 */
export function notifyError(error, options = {}) {
  const { message, errors } = parseApiError(error);
  const { skipIfFields = false, id } = options;

  // Avoid duplicate toast when the page already shows field errors + FormAlert
  if (skipIfFields && errors.length > 0) return;

  // Same id replaces the previous toast instead of stacking another one
  toast.error(message || DEFAULT_ERROR_MESSAGE, id ? { id } : undefined);
}
