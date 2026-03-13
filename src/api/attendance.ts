import { api } from './axios';
import type { Attendance, AttendanceBulkPayload } from '../types';

export async function getGroupAttendance(groupId: string) {
  const res = await api.get<Attendance[]>(`/attendance/group/${groupId}`);
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw as { data: Attendance[] }).data ?? [];
}

export async function getStudentAttendance(studentId: string) {
  const res = await api.get<Attendance[]>(`/attendance/student/${studentId}`);
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw as { data: Attendance[] }).data ?? [];
}

export async function createAttendanceBulk(payload: AttendanceBulkPayload) {
  const res = await api.post<Attendance[]>('/attendance', payload);
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw as { data: Attendance[] }).data ?? [];
}
