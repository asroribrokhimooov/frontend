import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import { safeArray } from '../utils/safeArray';
import type { Student, StudentCreatePayload, StudentPatchPayload } from '../types';

const QUERY_KEY_STUDENTS = ['students'] as const;

export function useStudents() {
  return useQuery({
    queryKey: QUERY_KEY_STUDENTS,
    queryFn: async (): Promise<Student[]> => {
      try {
        const res = await api.get<Student[] | { data: Student[] }>('/students');
        return safeArray<Student>(res.data);
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useStudent(id: string | undefined | null) {
  return useQuery({
    queryKey: [...QUERY_KEY_STUDENTS, id],
    queryFn: async (): Promise<Student | null> => {
      if (!id) return null;
      try {
        const res = await api.get<Student | { data: Student }>(`/students/${id}`);
        const raw = res.data;
        return (raw as { data: Student }).data ?? (raw as Student) ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: StudentCreatePayload) => {
      const res = await api.post<Student>('/students', {
        first_name: payload.first_name,
        last_name: payload.last_name,
        phone: payload.phone,
        parent_name: payload.parent_name,
        parent_phone: payload.parent_phone,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_STUDENTS });
    },
  });
}

export function useUpdateStudent(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: StudentPatchPayload) => {
      if (!id) throw new Error('Student id required');
      const body: Record<string, unknown> = {};
      if (payload.first_name !== undefined) body.first_name = payload.first_name;
      if (payload.last_name !== undefined) body.last_name = payload.last_name;
      if (payload.phone !== undefined) body.phone = payload.phone;
      if (payload.parent_name !== undefined) body.parent_name = payload.parent_name;
      if (payload.parent_phone !== undefined) body.parent_phone = payload.parent_phone;
      const res = await api.patch<Student>(`/students/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_STUDENTS });
      if (id) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_STUDENTS, id] });
      }
    },
  });
}

export function useArchiveStudent(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Student id required');
      const res = await api.patch<Student>(`/students/${id}/archive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_STUDENTS });
      if (id) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_STUDENTS, id] });
      }
    },
  });
}

export function useAddStudentToGroup(studentId?: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: string | { studentId: string; groupId: string }) => {
      const id = typeof payload === 'string' ? studentId : payload.studentId;
      const groupId = typeof payload === 'string' ? payload : payload.groupId;
      if (!id) throw new Error('Student id required');
      const res = await api.post<unknown>(`/students/${id}/groups`, {
        group_id: groupId,
      });
      return res.data;
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_STUDENTS });
      const id = typeof payload === 'string' ? studentId : payload.studentId;
      if (id) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_STUDENTS, id] });
      }
    },
  });
}

export function useRemoveStudentFromGroup(studentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!studentId) throw new Error('Student id required');
      await api.delete(`/students/${studentId}/groups/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_STUDENTS });
      if (studentId) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_STUDENTS, studentId] });
      }
    },
  });
}
