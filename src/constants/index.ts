// Dars kunlari — tarjimalar locale fayllarida (lessonDays.*)

export const LESSON_DAYS = [
  { value: 'monday', labelKey: 'lessonDays.monday' },
  { value: 'tuesday', labelKey: 'lessonDays.tuesday' },
  { value: 'wednesday', labelKey: 'lessonDays.wednesday' },
  { value: 'thursday', labelKey: 'lessonDays.thursday' },
  { value: 'friday', labelKey: 'lessonDays.friday' },
  { value: 'saturday', labelKey: 'lessonDays.saturday' },
  { value: 'sunday', labelKey: 'lessonDays.sunday' },
] as const;

export const PAYMENT_METHODS = [
  { value: 'cash' as const, labelKey: 'payments.cash' },
  { value: 'card' as const, labelKey: 'payments.card' },
  { value: 'click' as const, labelKey: 'payments.click' },
  { value: 'transfer' as const, labelKey: 'payments.transfer' },
] as const;

export const PAYMENT_STATUSES = [
  { value: 'paid' as const, labelKey: 'payments.paid' },
  { value: 'partial' as const, labelKey: 'payments.partial' },
  { value: 'promised' as const, labelKey: 'payments.promised' },
  { value: 'prepaid' as const, labelKey: 'payments.prepaid' },
] as const;

export const ATTENDANCE_STATUSES = [
  { value: 'present' as const, labelKey: 'attendance.present' },
  { value: 'late' as const, labelKey: 'attendance.late' },
  { value: 'absent' as const, labelKey: 'attendance.absent' },
  { value: 'excused' as const, labelKey: 'attendance.excused' },
] as const;

export const REMINDER_TYPES = [
  { value: 'promised_payment' as const, labelKey: 'reminders.promisedPayment' },
  { value: 'debt_due' as const, labelKey: 'reminders.debtDue' },
] as const;

export const GROUP_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#6366F1',
] as const;
