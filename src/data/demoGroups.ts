import type { Group, Student } from '../types';
import { DEMO_STUDENTS } from './demoStudents';

export const DEMO_GROUPS: Group[] = [
  {
    id: 'demo-group-1',
    name: 'English guruh A1-A2',
    monthly_fee: 450000,
    lesson_days: ['monday', 'wednesday', 'friday'],
    lesson_time: '14:00',
    color: '#3B82F6',
    is_archived: false,
    students_count: 15,
    debtors: 3,
    attendance_percent: 87,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'demo-group-2',
    name: 'Matematika Advanced',
    monthly_fee: 380000,
    lesson_days: ['tuesday', 'thursday', 'saturday'],
    lesson_time: '10:00',
    color: '#10B981',
    is_archived: false,
    students_count: 18,
    debtors: 5,
    attendance_percent: 92,
    created_at: '2025-01-05T00:00:00Z',
  },
  {
    id: 'demo-group-3',
    name: "Rus tili boshlang'ich",
    monthly_fee: 320000,
    lesson_days: ['monday', 'wednesday'],
    lesson_time: '16:00',
    color: '#F59E0B',
    is_archived: false,
    students_count: 16,
    debtors: 2,
    attendance_percent: 79,
    created_at: '2025-01-10T00:00:00Z',
  },
  {
    id: 'demo-group-4',
    name: 'IT Dasturlash Python',
    monthly_fee: 550000,
    lesson_days: ['tuesday', 'thursday'],
    lesson_time: '09:00',
    color: '#8B5CF6',
    is_archived: false,
    students_count: 17,
    debtors: 4,
    attendance_percent: 95,
    created_at: '2025-01-15T00:00:00Z',
  },
];

// Student IDs assigned to each demo group
export const DEMO_GROUP_STUDENT_IDS: Record<string, string[]> = {
  'demo-group-1': [
    'demo-1', 'demo-2', 'demo-3', 'demo-4', 'demo-5',
    'demo-6', 'demo-7', 'demo-8', 'demo-9', 'demo-10',
    'demo-11', 'demo-12', 'demo-13', 'demo-14', 'demo-15',
  ],
  'demo-group-2': [
    'demo-16', 'demo-17', 'demo-18', 'demo-19', 'demo-20',
    'demo-21', 'demo-22', 'demo-23', 'demo-24', 'demo-25',
    'demo-26', 'demo-27', 'demo-28', 'demo-29', 'demo-30',
    'demo-31', 'demo-32', 'demo-33',
  ],
  'demo-group-3': [
    'demo-34', 'demo-35', 'demo-36', 'demo-37', 'demo-38',
    'demo-39', 'demo-40', 'demo-41', 'demo-42', 'demo-43',
    'demo-44', 'demo-45', 'demo-46', 'demo-47', 'demo-48', 'demo-49',
  ],
  'demo-group-4': [
    'demo-50', 'demo-51', 'demo-52', 'demo-53', 'demo-54',
    'demo-55', 'demo-56', 'demo-57', 'demo-58', 'demo-59',
    'demo-60', 'demo-1', 'demo-3', 'demo-5', 'demo-7',
    'demo-9', 'demo-11',
  ],
};

export function getDemoGroupStudents(groupId: string): Student[] {
  const ids = DEMO_GROUP_STUDENT_IDS[groupId] ?? [];
  return ids
    .map((id) => DEMO_STUDENTS.find((s) => s.id === id))
    .filter(Boolean) as Student[];
}

export function getDemoStudentsNotInGroup(groupId: string): Student[] {
  const ids = new Set(DEMO_GROUP_STUDENT_IDS[groupId] ?? []);
  return DEMO_STUDENTS.filter((s) => !ids.has(s.id));
}
