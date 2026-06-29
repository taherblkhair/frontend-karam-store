import { useState, useCallback } from 'react';
import { mapFieldErrors, parseApiError } from '../utils/apiMessage.js';

/**
 * Apply API validation errors to form fields.
 * Field messages are displayed as-is from the backend `errors` array.
 */
export function useFormErrors() {
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');

  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setFormError('');
  }, []);

  const applyApiError = useCallback((error) => {
    const { message, errors } = parseApiError(error);
    const mapped = mapFieldErrors(errors);

    setFieldErrors(mapped);

    // General alert when there are no field-specific errors
    setFormError(errors.length ? '' : message);

    return { message, errors, fieldErrors: mapped };
  }, []);

  const getFieldError = useCallback((field) => fieldErrors[field] || '', [fieldErrors]);

  return { fieldErrors, formError, clearErrors, applyApiError, getFieldError };
}
