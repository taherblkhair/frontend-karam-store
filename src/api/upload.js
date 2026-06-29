import { createApiError } from '../utils/apiMessage.js';

export async function uploadFile(file, field = 'products') {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('token');
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw createApiError({
      message: data.message,
      errors: data.errors,
      statusCode: data.statusCode ?? response.status,
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
