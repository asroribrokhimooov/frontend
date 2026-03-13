// Backend response formatiga mos type'lar

export interface User {
  id: string;
  short_id?: string;
  email?: string;
  phone?: string;
  first_name: string;
  last_name: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student';
  status: 'active' | 'inactive';
  plan?: 'free' | 'pro';
  language?: string;
  theme?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Group {
  id: string;
  name: string;
  course_name?: string;
  teacher_id?: string;
  teacher?: User;
  monthly_fee: number;
  lesson_days: string[];
  lesson_time: string;
  is_archived?: boolean;
  /** @deprecated backend returns is_archived, not status */
  status?: 'active' | 'completed' | 'cancelled';
  students_count?: number;
  total_students?: number;
  debtors?: number;
  attendance_percent?: number;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GroupPayload {
  name: string;
  monthly_fee: number;
  lesson_days: string[];
  lesson_time: string;
  color: string;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  parent_name?: string;
  parent_phone?: string;
  student_code: string;
  is_archived?: boolean;
  /** @deprecated backend returns is_archived, not status */
  status?: 'active' | 'inactive';
  /** balance is a frontend-computed field, not returned by the API */
  balance?: number;
  groups?: Group[];
  created_at?: string;
  updated_at?: string;
}

export interface StudentCreatePayload {
  first_name: string;
  last_name: string;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
}

export interface StudentPatchPayload {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface Attendance {
  id: string;
  student_id: string;
  group_id: string;
  date: string;
  status: AttendanceStatus;
  student?: Student;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  group_id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
}

export interface AttendanceBulkPayload {
  records: AttendanceRecord[];
}

export type PaymentMethod = 'cash' | 'click' | 'payme' | 'other';
export type PaymentStatus = 'paid' | 'partial' | 'promised' | 'prepaid';

export interface Payment {
  id: string;
  student_id: string;
  group_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  month_year: string;
  promised_date?: string | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
  student?: Student;
  group?: Group;
}

export interface PaymentCreatePayload {
  student_id: string;
  group_id: string;
  amount: number;
  month_year: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  promised_date?: string | null;
  note?: string | null;
}

export interface PaymentUpdatePayload {
  amount?: number;
  payment_method?: PaymentMethod;
  status?: PaymentStatus;
  promised_date?: string | null;
  note?: string | null;
}

export interface Debtor {
  student_id: string;
  student: Student;
  group: Group;
  total_debt: number;
}

export interface PaymentReport {
  month_year: string;
  expected_revenue: number;
  total_received: number;
  remaining_balance: number;
  prepaid_amount: number;
  payment_methods: Partial<Record<PaymentMethod, number>>;
}

export type ReminderType = 'promised_payment' | 'debt_due';

export interface Reminder {
  id: string;
  type: ReminderType;
  due_date: string;
  student_id: string;
  student?: Student;
  status: 'pending' | 'completed' | 'archived';
  created_at?: string;
  updated_at?: string;
}

export interface ReminderCreatePayload {
  student_id: string;
  type: ReminderType;
  due_date: string;
}

export interface RemindersSummary {
  overdue: Reminder[];
  today: Reminder[];
  upcoming: Reminder[];
}

export interface MessageTemplate {
  id: string;
  key: string;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  group_id?: string;
  text: string;
  created_at: string;
  is_read: boolean;
  sender?: User;
  receiver?: User;
}

export interface MessageSendPayload {
  group_id: string | null;
  student_id: string | null;
  template_key: string;
  content: string;
}

export interface Archive {
  id: string;
  entity_type: 'group' | 'student' | 'payment';
  entity_id: string;
  data: Record<string, unknown>;
  archived_at: string;
  archived_by: string;
}

export interface ArchiveRestorePayload {
  type: 'group' | 'student' | 'payment';
  id: string;
}

// API pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Dashboard API responses
export interface PaymentsReportResponse {
  expected_revenue?: number;
  total?: number;
}

export interface DebtorsResponse {
  count?: number;
  total?: number;
}

export interface RemindersSummaryResponse extends RemindersSummary {}

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
}

export interface AppLockPayload {
  pin: string;
}

export interface UpdateLanguagePayload {
  language: string;
}
