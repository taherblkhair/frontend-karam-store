/**
 * Extract the message from a successful API response.
 * The backend always sends ready-to-display Arabic text in `message`.
 */
export function getApiMessage(response) {
  if (!response) return '';
  if (typeof response === 'string') return response;
  return response.message ?? '';
}

/**
 * Normalize API / network errors into a consistent shape.
 * No translation or transformation — values come directly from the backend.
 */
export function parseApiError(error) {
  if (!error) {
    return { message: '', errors: [], statusCode: null };
  }

  if (typeof error === 'string') {
    return { message: error, errors: [], statusCode: null };
  }

  return {
    message: error.message ?? '',
    errors: Array.isArray(error.errors) ? error.errors : [],
    statusCode: error.statusCode ?? error.response?.data?.statusCode ?? error.response?.status ?? null,
  };
}

/**
 * Map validation errors to field names for inline form display.
 * Supports express-validator (`param`) and Sequelize (`path`) shapes.
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
  return {
    message: payload.message ?? '',
    errors: Array.isArray(payload.errors) ? payload.errors : [],
    statusCode: payload.statusCode ?? null,
  };
}
