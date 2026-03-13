import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as remindersAPI from '../api/reminders';
import type { ReminderCreatePayload } from '../types';

const QUERY_KEY_REMINDERS = ['reminders'] as const;
const QUERY_KEY_REMINDERS_SUMMARY = ['reminders', 'summary'] as const;

export function useReminders() {
  return useQuery({
    queryKey: QUERY_KEY_REMINDERS,
    queryFn: () => remindersAPI.getReminders(),
  });
}

export function useRemindersSummary() {
  return useQuery({
    queryKey: QUERY_KEY_REMINDERS_SUMMARY,
    queryFn: () => remindersAPI.getRemindersSummary(),
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReminderCreatePayload) => remindersAPI.createReminder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_REMINDERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_REMINDERS_SUMMARY });
    },
  });
}

export function useArchiveReminder(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!id) throw new Error('Reminder id required');
      return remindersAPI.archiveReminder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_REMINDERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_REMINDERS_SUMMARY });
    },
  });
}
