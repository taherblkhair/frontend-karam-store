import { createApiError, NETWORK_ERROR_MESSAGE } from '../utils/apiMessage.js';

export async function uploadFile(file, field = 'products') {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('token');

  let response;
  try {
    response = await fetch('/api/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
  } catch {
    throw createApiError({
      message: NETWORK_ERROR_MESSAGE,
      code: 'NETWORK_ERROR',
    });
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw createApiError({
      message: data.message || 'فشل رفع الملف',
      errors: data.errors,
      statusCode: data.statusCode ?? response.status,
      code: data.code,
    });
  }

  return data;
}

export async function uploadFiles(files, field = 'products') {
  const results = [];
  for (const file of files) {
    const result = await uploadFile(file, field);
    results.push(result.data);
  }
  return results;
}
