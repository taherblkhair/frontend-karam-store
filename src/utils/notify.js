import toast from 'react-hot-toast';
import { getApiMessage, parseApiError } from './apiMessage.js';

/** Show API success message in a toast (message comes from backend as-is). */
export function notifySuccess(response) {
  const message = getApiMessage(response);
  if (message) toast.success(message);
}

/** Show API error message in a toast (message comes from backend as-is). */
export function notifyError(error) {
  const { message } = parseApiError(error);
  if (message) toast.error(message);
}
