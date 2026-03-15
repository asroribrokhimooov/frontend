import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import { safeArray } from '../utils/safeArray';
import * as paymentsAPI from '../api/payments';
import type { Payment, PaymentCreatePayload, PaymentUpdatePayload, Debtor, PaymentReport } from '../types';

const QUERY_KEY_PAYMENTS = ['payments'] as const;
const QUERY_KEY_DEBTORS = ['payments', 'debtors'] as const;
const QUERY_KEY_REPORTS = ['payments', 'reports'] as const;

export function usePayments() {
  return useQuery({
    queryKey: QUERY_KEY_PAYMENTS,
    queryFn: async (): Promise<Payment[]> => {
      try {
        const res = await api.get<Payment[] | { data: Payment[] }>('/payments');
        return safeArray<Payment>(res.data);
      } catch {
        return [];
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
        return safeArray<Debtor>(res.data);
      } catch {
        return [];
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
        return {
          month_year: monthYear,
          expected_revenue: 0,
          total_received: 0,
          remaining_balance: 0,
          prepaid_amount: 0,
          payment_methods: {},
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
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['payments-reports'] });
      queryClient.invalidateQueries({ queryKey: ['payments-debtors'] });
      queryClient.invalidateQueries({ queryKey: ['payments-recent'] });
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
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['payments-reports'] });
      queryClient.invalidateQueries({ queryKey: ['payments-debtors'] });
      queryClient.invalidateQueries({ queryKey: ['payments-recent'] });
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
