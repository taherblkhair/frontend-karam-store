const DEFAULT_ERROR_MESSAGE = 'حدث خطأ غير متوقع';
const NETWORK_ERROR_MESSAGE = 'تعذر الاتصال بالخادم، تحقق من الإنترنت';

/**
 * Extract the message from a successful API response.
 */
export function getApiMessage(response, fallback = '') {
  if (!response) return fallback;
  if (typeof response === 'string') return response;
  return response.message || fallback;
}

/**
 * Normalize API / network errors into a consistent shape.
 */
export function parseApiError(error) {
  if (!error) {
    return { message: DEFAULT_ERROR_MESSAGE, errors: [], statusCode: null, code: null };
  }

  if (typeof error === 'string') {
    return { message: error, errors: [], statusCode: null, code: null };
  }

  // Already normalized (from axios interceptor / createApiError)
  if (error.message || Array.isArray(error.errors)) {
    return {
      message: error.message || DEFAULT_ERROR_MESSAGE,
      errors: Array.isArray(error.errors) ? error.errors : [],
      statusCode: error.statusCode ?? null,
      code: error.code ?? null,
    };
  }

  // Raw axios error (fallback)
  const payload = error.response?.data;
  if (payload) {
    return {
      message: payload.message || DEFAULT_ERROR_MESSAGE,
      errors: Array.isArray(payload.errors) ? payload.errors : [],
      statusCode: payload.statusCode ?? error.response?.status ?? null,
      code: payload.code ?? null,
    };
  }

  if (error.request && !error.response) {
    return {
      message: NETWORK_ERROR_MESSAGE,
      errors: [],
      statusCode: null,
      code: 'NETWORK_ERROR',
    };
  }

  return {
    message: error.message || DEFAULT_ERROR_MESSAGE,
    errors: [],
    statusCode: null,
    code: null,
  };
}

/**
 * Map validation errors to field names for inline form display.
 */
export function mapFieldErrors(errors = []) {
  const map = {};

  for (const err of errors) {
    const field = err.field || err.param || err.path;
    if (field && err.message) {
      map[field] = err.message;
    }
  }

  return map;
}

export function createApiError(payload = {}) {
  const hasNetworkHint =
    !payload.message &&
    (payload.code === 'NETWORK_ERROR' || payload.statusCode == null);

  return {
    message: payload.message || (hasNetworkHint ? NETWORK_ERROR_MESSAGE : DEFAULT_ERROR_MESSAGE),
    errors: Array.isArray(payload.errors) ? payload.errors : [],
    statusCode: payload.statusCode ?? null,
    code: payload.code ?? null,
  };
}

export { DEFAULT_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE };
