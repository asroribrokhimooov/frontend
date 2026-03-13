import { api } from './axios';
import type { Archive, ArchiveRestorePayload } from '../types';

export async function getArchive() {
  const res = await api.get<Archive[] | { data: Archive[] }>('/archive');
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw as { data: Archive[] }).data ?? [];
}

export async function restoreArchive(payload: ArchiveRestorePayload) {
  const res = await api.post<Archive>('/archive/restore', {
    type: payload.type,
    id: payload.id,
  });
  return res.data;
}
