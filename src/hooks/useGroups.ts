import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import { safeArray } from '../utils/safeArray';
import type { Group, GroupPayload } from '../types';

const QUERY_KEY_GROUPS = ['groups'] as const;

export function useGroups() {
  return useQuery({
    queryKey: QUERY_KEY_GROUPS,
    queryFn: async (): Promise<Group[]> => {
      try {
        const res = await api.get<Group[] | { data: Group[] }>('/groups');
        return safeArray<Group>(res.data);
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useGroup(id: string | undefined | null) {
  return useQuery({
    queryKey: [...QUERY_KEY_GROUPS, id],
    queryFn: async (): Promise<Group | null> => {
      if (!id) return null;
      try {
        const res = await api.get<Group>(`/groups/${id}`);
        return res.data ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: GroupPayload) => {
      const res = await api.post<Group>('/groups', {
        name: payload.name,
        monthly_fee: Number(payload.monthly_fee),
        lesson_days: payload.lesson_days,
        lesson_time: payload.lesson_time,
        color: payload.color,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_GROUPS });
    },
  });
}

export function useUpdateGroup(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<GroupPayload>) => {
      if (!id) throw new Error('Group id required');
      const res = await api.patch<Group>(`/groups/${id}`, {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.monthly_fee !== undefined && { monthly_fee: Number(payload.monthly_fee) }),
        ...(payload.lesson_days !== undefined && { lesson_days: payload.lesson_days }),
        ...(payload.lesson_time !== undefined && { lesson_time: payload.lesson_time }),
        ...(payload.color !== undefined && { color: payload.color }),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_GROUPS });
      if (id) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_GROUPS, id] });
      }
    },
  });
}

export function useArchiveGroup(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Group id required');
      const res = await api.patch<Group>(`/groups/${id}/archive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_GROUPS });
      if (id) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_GROUPS, id] });
      }
    },
  });
}
