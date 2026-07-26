import { useState, useCallback } from 'react';
import { mapFieldErrors, parseApiError } from '@shared/utils/apiMessage.js';

/**
 * Apply API validation errors to form fields + a general form alert.
 */
export function useFormErrors() {
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');

  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setFormError('');
  }, []);

  const applyApiError = useCallback((error) => {
    const { message, errors, statusCode, code } = parseApiError(error);
    const mapped = mapFieldErrors(errors);
    const hasFields = Object.keys(mapped).length > 0;

    setFieldErrors(mapped);
    // Always keep a general message so FormAlert can show it
    setFormError(message || '');

    return { message, errors, fieldErrors: mapped, hasFields, statusCode, code };
  }, []);

  const getFieldError = useCallback((field) => fieldErrors[field] || '', [fieldErrors]);

  return { fieldErrors, formError, clearErrors, applyApiError, getFieldError };
}
