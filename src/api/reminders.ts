import { api } from './axios';
import { safeArray } from '../utils/safeArray';
import type { Reminder, ReminderCreatePayload, RemindersSummary } from '../types';

export async function getReminders() {
  const res = await api.get<Reminder[]>('/reminders');
  return safeArray<Reminder>(res.data);
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
