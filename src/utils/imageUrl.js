import { API_URL } from '../services/apiClient';

export function getImageUrl(filename) {
  if (!filename) return null;
  const base = (API_URL || '').replace(/\/$/, '');
  return `${base}/images/${filename}`;
}

export default getImageUrl;
