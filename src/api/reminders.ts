import { api } from './axios';
import type { Reminder, ReminderCreatePayload, RemindersSummary } from '../types';

export async function getReminders() {
  const res = await api.get<Reminder[]>('/reminders');
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw as { data: Reminder[] }).data ?? [];
}

export async function getRemindersSummary() {
  const res = await api.get<RemindersSummary>('/reminders/summary');
  const raw = res.data;
  return (raw as unknown as { data: RemindersSummary }).data ?? raw;
}

export async function createReminder(payload: ReminderCreatePayload) {
  const res = await api.post<Reminder>('/reminders', payload);
  return res.data;
}

export async function archiveReminder(id: string) {
  const res = await api.patch<Reminder>(`/reminders/${id}/archive`);
  return res.data;
}
