import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as attendanceAPI from '../api/attendance';
import type { AttendanceBulkPayload } from '../types';

const QUERY_KEY_ATTENDANCE = ['attendance'] as const;

export function useGroupAttendance(groupId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY_ATTENDANCE, 'group', groupId],
    queryFn: () => {
      if (!groupId) throw new Error('Group ID required');
      return attendanceAPI.getGroupAttendance(groupId);
    },
    enabled: !!groupId,
  });
}

export function useStudentAttendance(studentId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY_ATTENDANCE, 'student', studentId],
    queryFn: () => {
      if (!studentId) throw new Error('Student ID required');
      return attendanceAPI.getStudentAttendance(studentId);
    },
    enabled: !!studentId,
  });
}

export function useCreateAttendanceBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AttendanceBulkPayload) => attendanceAPI.createAttendanceBulk(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_ATTENDANCE });
    },
  });
}
