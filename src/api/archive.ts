import { api } from './axios';
import type { Archive, ArchiveRestorePayload } from '../types';

export async function getArchive(): Promise<Archive[]> {
  const res = await api.get('/archive');
  const raw = res.data;
  // axios interceptor allaqachon { data: ... } ni ochib beradi
  // shuning uchun raw to'g'ridan-to'g'ri array yoki ichida array bo'lishi mumkin
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    // { data: [...] } yoki { groups: [], students: [], payments: [] } formatlar
    if (Array.isArray(raw.data)) return raw.data;
    // Grouped format: flatten groups + students + payments
    const items: Archive[] = [];
    if (Array.isArray(raw.groups)) items.push(...raw.groups);
    if (Array.isArray(raw.students)) items.push(...raw.students);
    if (Array.isArray(raw.payments)) items.push(...raw.payments);
    if (items.length > 0) return items;
  }
  return [];
}

export async function restoreArchive(payload: ArchiveRestorePayload) {
  const res = await api.post<Archive>('/archive/restore', {
    type: payload.type,
    id: payload.id,
  });
  return res.data;
}
