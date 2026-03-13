import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import * as paymentsAPI from '../api/payments';
import type { Payment, PaymentCreatePayload, PaymentUpdatePayload, Debtor, PaymentReport } from '../types';
import { DEMO_PAYMENTS, DEMO_DEBTORS } from '../data/demoPayments';

const QUERY_KEY_PAYMENTS = ['payments'] as const;
const QUERY_KEY_DEBTORS = ['payments', 'debtors'] as const;
const QUERY_KEY_REPORTS = ['payments', 'reports'] as const;

export function usePayments() {
  return useQuery({
    queryKey: QUERY_KEY_PAYMENTS,
    queryFn: async (): Promise<Payment[]> => {
      try {
        const res = await api.get<Payment[] | { data: Payment[] }>('/payments');
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw as { data: Payment[] }).data ?? [];
        return list.length > 0 ? list : DEMO_PAYMENTS;
      } catch {
        return DEMO_PAYMENTS;
      }
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useDebtors() {
  return useQuery({
    queryKey: QUERY_KEY_DEBTORS,
    queryFn: async (): Promise<Debtor[]> => {
      try {
        const res = await api.get<Debtor[] | { data: Debtor[] }>('/payments/debtors');
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw as { data: Debtor[] }).data ?? [];
        return list.length > 0 ? list : DEMO_DEBTORS;
      } catch {
        return DEMO_DEBTORS;
      }
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function usePaymentReports(monthYear: string) {
  return useQuery({
    queryKey: [...QUERY_KEY_REPORTS, monthYear],
    queryFn: async (): Promise<PaymentReport> => {
      try {
        const res = await api.get<PaymentReport>('/payments/reports', {
          params: { month_year: monthYear },
        });
        const raw = res.data;
        return (raw as unknown as { data: PaymentReport }).data ?? raw;
      } catch {
        // Build demo report from demo payments
        const monthPayments = DEMO_PAYMENTS.filter((p) => p.month_year === monthYear);
        const totalReceived = monthPayments.reduce((sum, p) => sum + p.amount, 0);
        const methods: Partial<Record<string, number>> = {};
        monthPayments.forEach((p) => {
          methods[p.payment_method] = (methods[p.payment_method] ?? 0) + p.amount;
        });
        return {
          month_year: monthYear,
          expected_revenue: 8_500_000,
          total_received: totalReceived || 4_250_000,
          remaining_balance: 8_500_000 - (totalReceived || 4_250_000),
          prepaid_amount: 500000,
          payment_methods: methods,
        } as PaymentReport;
      }
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PaymentCreatePayload) => paymentsAPI.createPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_PAYMENTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_DEBTORS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_REPORTS });
    },
  });
}

export function useUpdatePayment(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PaymentUpdatePayload) => {
      if (!id) throw new Error('Payment id required');
      return paymentsAPI.updatePayment(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_PAYMENTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_DEBTORS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_REPORTS });
    },
  });
}

export function useArchivePayment(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!id) throw new Error('Payment id required');
      return paymentsAPI.archivePayment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_PAYMENTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_DEBTORS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_REPORTS });
    },
  });
}
