import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import type { Message, MessageTemplate, MessageSendPayload } from '../types';

const QUERY_KEY_MESSAGES = ['messages'] as const;
const QUERY_KEY_TEMPLATES = ['messages', 'templates'] as const;

export function useMessages() {
  return useQuery({
    queryKey: QUERY_KEY_MESSAGES,
    queryFn: async (): Promise<Message[]> => {
      const res = await api.get<Message[] | { data: Message[] }>('/messages');
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw as { data: Message[] }).data ?? [];
    },
  });
}

export function useMessageTemplates() {
  return useQuery({
    queryKey: QUERY_KEY_TEMPLATES,
    queryFn: async (): Promise<MessageTemplate[]> => {
      const res = await api.get<MessageTemplate[] | { data: MessageTemplate[] }>('/messages/templates');
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw as { data: MessageTemplate[] }).data ?? [];
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MessageSendPayload) => {
      const res = await api.post<Message>('/messages/send', {
        group_id: payload.group_id,
        student_id: payload.student_id,
        template_key: payload.template_key,
        content: payload.content,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_MESSAGES });
    },
  });
}