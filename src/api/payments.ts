import { api } from './axios';
import type { Payment, PaymentCreatePayload, PaymentUpdatePayload, Debtor, PaymentReport } from '../types';

export async function getPayments() {
  const res = await api.get<Payment[]>('/payments');
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw as { data: Payment[] }).data ?? [];
}

export async function getDebtors() {
  const res = await api.get<Debtor[]>('/payments/debtors');
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw as { data: Debtor[] }).data ?? [];
}

export async function getPaymentReports(monthYear: string) {
  const res = await api.get<PaymentReport>('/payments/reports', {
    params: { month_year: monthYear },
  });
  const raw = res.data;
  return (raw as unknown as { data: PaymentReport }).data ?? raw;
}

export async function createPayment(payload: PaymentCreatePayload) {
  const res = await api.post<Payment>('/payments', payload);
  return res.data;
}

export async function updatePayment(id: string, payload: PaymentUpdatePayload) {
  const res = await api.patch<Payment>(`/payments/${id}`, payload);
  return res.data;
}

export async function archivePayment(id: string) {
  const res = await api.patch<Payment>(`/payments/${id}/archive`);
  return res.data;
}
