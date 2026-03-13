import { api } from './axios';
import type { Message, MessageTemplate, MessageSendPayload } from '../types';

export async function getMessages() {
  const res = await api.get<Message[] | { data: Message[] }>('/messages');
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw as { data: Message[] }).data ?? [];
}

export async function getMessageTemplates() {
  const res = await api.get<MessageTemplate[] | { data: MessageTemplate[] }>('/messages/templates');
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw as { data: MessageTemplate[] }).data ?? [];
}

export async function sendMessage(payload: MessageSendPayload) {
  const res = await api.post<Message>('/messages/send', {
    group_id: payload.group_id,
    student_id: payload.student_id,
    template_key: payload.template_key,
    content: payload.content,
  });
  return res.data;
}
