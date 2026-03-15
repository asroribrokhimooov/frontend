import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  Wallet,
  AlertCircle,
  Plus,
  ClipboardList,
  MessageSquare,
  UserPlus,
  Bell,
  ChevronRight,
  Clock,
  X,
  FileDown,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { writeFile, utils } from 'xlsx';
import { useDebtors } from '../../hooks/usePayments';
import { formatCurrency } from '../../utils/formatCurrency';
import type { Debtor } from '../../types';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/shared/EmptyState';
import { cn } from '../../utils/cn';
import { safeArray } from '../../utils/safeArray';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../utils/formatDate';
import { formatNumber } from '../../utils/formatNumber';
import { api } from '../../api/axios';
import { PaymentFormModal } from '../payments/PaymentFormModal';
import { StudentFormModal } from '../students/StudentFormModal';
import { useCreatePayment } from '../../hooks/usePayments';
import { useCreateStudent, useAddStudentToGroup } from '../../hooks/useStudents';
import type {
  Student,
  Group,
  Payment,
  PaymentsReportResponse,
  DebtorsResponse,
  Reminder,
  RemindersSummaryResponse,
  PaginatedResponse,
  PaymentCreatePayload,
  PaymentUpdatePayload,
  StudentCreatePayload,
} from '../../types';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function getTodayDayKey(): string {
  const i = new Date().getDay();
  return DAY_NAMES[i];
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-xl bg-gray-200', className)} />
  );
}

function KpiSkeleton() {
  return (
    <Card padding="md" className="h-[100px]">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-16" />
    </Card>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const todayDayKey = getTodayDayKey();

  // Quick-action modal state
  const [paymentModalOpen, setPaymentModalOpen]       = useState(false);
  const [studentModalOpen, setStudentModalOpen]       = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [debtorsModalOpen, setDebtorsModalOpen]       = useState(false);

  // Debtors list for modal
  const { data: debtorsList = [] } = useDebtors();

  // Mutations (same hooks as PaymentsPage / StudentsPage)
  const createPayment      = useCreatePayment();
  const createStudent      = useCreateStudent();
  const addStudentToGroup  = useAddStudentToGroup(undefined);

  const { data: studentsData, isLoading: studentsLoading, isError: studentsError } = useQuery({
    queryKey: ['dashboard-students'],
    queryFn: async () => {
      const res = await api.get<Student[] | { data: Student[]; total?: number }>('/students');
      const data = safeArray<Student>(res.data);
      const total = Array.isArray(res.data) ? res.data.length : (res.data as { total?: number }).total ?? data.length;
      return { data, total };
    },
  });

  const { data: groupsData, isLoading: groupsLoading, isError: groupsError } = useQuery({
    queryKey: ['dashboard-groups'],
    queryFn: async () => {
      const res = await api.get<Group[]>('/groups');
      return safeArray<Group>(res.data);
    },
  });

  const { data: reportsData, isLoading: reportsLoading, isError: reportsError } = useQuery({
    queryKey: ['payments-reports'],
    queryFn: async () => {
      const res = await api.get<PaymentsReportResponse>('/payments/reports');
      return res.data;
    },
  });

  const { data: debtorsData, isLoading: debtorsLoading, isError: debtorsError } = useQuery({
    queryKey: ['payments-debtors'],
    queryFn: async () => {
      const res = await api.get<DebtorsResponse>('/payments/debtors');
      return res.data;
    },
  });

  const { data: remindersSummary, isLoading: remindersLoading, isError: remindersError } = useQuery({
    queryKey: ['reminders-summary'],
    queryFn: async () => {
      const res = await api.get<RemindersSummaryResponse>('/reminders/summary');
      return res.data;
    },
  });

  const { data: recentPaymentsData, isLoading: paymentsLoading, isError: paymentsError } = useQuery({
    queryKey: ['payments-recent'],
    queryFn: async () => {
      const res = await api.get<Payment[] | PaginatedResponse<Payment>>('/payments', {
        params: { limit: 5 },
      });
      return safeArray<Payment>(res.data);
    },
  });

  const totalStudents = studentsData?.total ?? safeArray(studentsData?.data).length;
  const groups = safeArray<Group>(groupsData);
  const activeGroups = useMemo(
    () => groups.filter((g) => !g.is_archived),
    [groups]
  );
  const todayLessons = useMemo(
    () => groups.filter((g) => Array.isArray(g.lesson_days) && g.lesson_days.includes(todayDayKey) && !g.is_archived),
    [groups, todayDayKey]
  );
  const expectedRevenue = reportsData?.expected_revenue ?? reportsData?.total ?? 0;
  const debtorsCount = Array.isArray(debtorsData) ? debtorsData.length : (debtorsData?.count ?? debtorsData?.total ?? 0);
  const recentPayments = safeArray<Payment>(recentPaymentsData);

  const hasKpiError = studentsError || groupsError || reportsError || debtorsError;
  const isLoading = studentsLoading || groupsLoading || reportsLoading || debtorsLoading;

  // ── Quick-action handlers ────────────────────────────────────────────────
  const handlePaymentSubmit = (
    payload: PaymentCreatePayload | PaymentUpdatePayload,
    isCreate: boolean,
  ) => {
    if (isCreate) {
      createPayment.mutate(payload as PaymentCreatePayload, {
        onSuccess: () => setPaymentModalOpen(false),
      });
    }
  };

  const handlePaymentSubmitMultiple = (payloads: PaymentCreatePayload[]) => {
    payloads.forEach((p) => createPayment.mutate(p));
    setPaymentModalOpen(false);
  };

  const handleStudentSubmit = (payload: StudentCreatePayload, groupId: string | null) => {
    createStudent.mutate(payload, {
      onSuccess: (created) => {
        if (created?.id && groupId) {
          addStudentToGroup.mutate(
            { studentId: created.id, groupId },
            { onSuccess: () => setStudentModalOpen(false) },
          );
        } else {
          setStudentModalOpen(false);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Sidebar />
      <main className="md:pl-[280px] pb-20 md:pb-0">
        <Header />
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="mb-8 mt-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#111827] tracking-tight">
              {t('dashboard.welcome', { name: user?.first_name || 'Foydalanuvchi' })}!
            </h1>
            <p className="text-base text-gray-500 mt-2 font-medium">Bugungi kuningiz unumli o'tsin.</p>
          </div>

          {/* Error state */}
          {hasKpiError && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <p className="text-red-700 text-sm">{t('common.error')}</p>
            </Card>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-4">
            {isLoading ? (
              <>
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
              </>
            ) : (
              <>
                <Card
                  padding="lg"
                  className="flex flex-col gap-2 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-2 transition-all duration-300 border-0 cursor-pointer select-none"
                  onClick={() => setDebtorsModalOpen(true)}
                >
                  <div className="flex items-center gap-3 text-gray-500 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold">{t('dashboard.debtorsCount')}</span>
                  </div>
                  <p className="text-3xl font-extrabold text-[#1F2937] ml-1">{formatNumber(debtorsCount)}</p>
                  <p className="text-xs text-red-400 ml-1 font-medium">Ro'yxatni ko'rish →</p>
                </Card>
                <Card padding="lg" className="flex flex-col gap-2 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-2 transition-all duration-300 border-0">
                  <div className="flex items-center gap-3 text-gray-500 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold">{t('dashboard.totalStudents')}</span>
                  </div>
                  <p className="text-3xl font-extrabold text-[#1F2937] ml-1">{formatNumber(totalStudents)}</p>
                </Card>
                <Card padding="lg" className="flex flex-col gap-2 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-2 transition-all duration-300 border-0">
                  <div className="flex items-center gap-3 text-gray-500 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold">{t('dashboard.expectedRevenue')}</span>
                  </div>
                  <p className="text-3xl font-extrabold text-[#1F2937] ml-1">{formatCurrency(expectedRevenue)}</p>
                </Card>
                <Card padding="lg" className="flex flex-col gap-2 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-2 transition-all duration-300 border-0">
                  <div className="flex items-center gap-3 text-gray-500 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold">{t('dashboard.totalGroups')}</span>
                  </div>
                  <p className="text-3xl font-extrabold text-[#1F2937] ml-1">{formatNumber(activeGroups.length)}</p>
                </Card>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left + center: Today's lessons */}
            <div className="lg:col-span-2 space-y-8">
              <Card padding="lg" className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border-0 h-[400px] flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#1F2937]">
                      {t('dashboard.todayLessons')}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">{todayLessons.length} ta guruh</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {groupsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-14 w-full rounded-xl" />
                      <Skeleton className="h-14 w-full rounded-xl" />
                      <Skeleton className="h-14 w-full rounded-xl" />
                    </div>
                  ) : todayLessons.length === 0 ? (
                    <EmptyState
                      title="Bugun dars yo'q"
                      description="Dam olish kuni, maroqli o'tsin!"
                    />
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {todayLessons
                        .sort((a, b) => (a.lesson_time ?? '').localeCompare(b.lesson_time ?? ''))
                        .map((g) => (
                        <div
                          key={g.id}
                          onClick={() => navigate(`/groups/${g.id}`)}
                          className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ background: g.color ?? '#3B82F6' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-[#1F2937] truncate">{g.name}</p>
                            <p className="text-xs text-gray-400">{g.students_count ?? 0} ta o'quvchi</p>
                          </div>
                          <span className="text-sm font-bold text-blue-600 shrink-0">{g.lesson_time}</span>
                          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Recent payments */}
              <Card padding="lg" className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#1F2937]">
                    So'nggi to'lovlar
                  </h2>
                </div>
                {paymentsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                ) : paymentsError ? (
                  <p className="text-sm text-red-600">{t('common.error')}</p>
                ) : recentPayments.length === 0 ? (
                  <EmptyState title="To'lovlar yo'q" description="Hozircha hech kim to'lov qilmagan" />
                ) : (
                  <>
                    <div className="divide-y divide-gray-100">
                      {recentPayments
                        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                        .slice(0, 5)
                        .map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-3 border-b last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                              {p.student?.first_name?.charAt(0) ?? '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#1F2937]">
                                {p.student?.first_name} {p.student?.last_name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {p.group?.name ?? '—'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#1F2937]">
                              {formatCurrency(p.amount)}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              p.status === 'paid'
                                ? 'bg-green-100 text-green-600'
                                : p.status === 'partial'
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-red-100 text-red-600'
                            }`}>
                              {p.status === 'paid' ? "To'landi"
                                : p.status === 'partial'
                                ? 'Qisman' : 'Kutilmoqda'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => navigate('/payments')}
                      className="text-blue-500 text-sm hover:underline mt-2"
                    >
                      Barchasini ko'rish →
                    </button>
                  </>
                )}
              </Card>
            </div>

            {/* Right: Quick actions + Reminders */}
            <div className="space-y-8">
              <div className="flex flex-col gap-4">
                {/* 2.1 To'lov qo'shish → opens PaymentFormModal */}
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(true)}
                  className="group flex items-center justify-between p-4 rounded-3xl bg-white shadow-sm hover:shadow-md transition-all duration-300 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F0F5FF] flex items-center justify-center text-[#3B82F6]">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1F2937] text-base mb-0.5">To'lov qo'shish</p>
                      <p className="text-sm text-gray-500">Tezkor to'lov kiritish</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#3B82F6]" />
                </button>

                {/* 2.2 Davomat qilish → opens groups list modal */}
                <button
                  type="button"
                  onClick={() => setAttendanceModalOpen(true)}
                  className="group flex items-center justify-between p-4 rounded-3xl bg-white shadow-sm hover:shadow-md transition-all duration-300 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] flex items-center justify-center text-[#22C55E]">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1F2937] text-base mb-0.5">Davomat qilish</p>
                      <p className="text-sm text-gray-500">Guruhlar davomati</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#22C55E]" />
                </button>

                {/* 2.3 Xabar yuborish → navigate to /messages */}
                <Link
                  to="/messages"
                  className="group flex items-center justify-between p-4 rounded-3xl bg-white shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5F3FF] flex items-center justify-center text-[#6366F1]">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1F2937] text-base mb-0.5">Xabar yuborish</p>
                      <p className="text-sm text-gray-500">O'quvchi yoki guruhga</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#6366F1]" />
                </Link>

                {/* 2.4 O'quvchi qo'shish → opens StudentFormModal */}
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(true)}
                  className="group flex items-center justify-between p-4 rounded-3xl bg-white shadow-sm hover:shadow-md transition-all duration-300 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#4F46E5]">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1F2937] text-base mb-0.5">O'quvchi qo'shish</p>
                      <p className="text-sm text-gray-500">15 soniyada ma'lumotlarni kiriting</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#4F46E5]" />
                </button>
              </div>

              <Card padding="lg" className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border-0">
                <h2 className="text-lg font-bold text-[#1F2937] mb-6 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-gray-400" />
                  {t('dashboard.reminders')}
                </h2>
                {remindersLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                  </div>
                ) : remindersError ? (
                  <p className="text-sm text-red-600">{t('common.error')}</p>
                ) : (
                  <div className="space-y-6">
                    {[
                      { key: 'overdue', items: safeArray<Reminder>(remindersSummary?.overdue), variant: 'danger' as const },
                      { key: 'today', items: safeArray<Reminder>(remindersSummary?.today), variant: 'warning' as const },
                      { key: 'upcoming', items: safeArray<Reminder>(remindersSummary?.upcoming), variant: 'info' as const },
                    ].map(({ key, items, variant }) => (
                      <div key={key}>
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t(`dashboard.${key}`)}</p>
                          <div className="h-px bg-gray-100 flex-1" />
                        </div>
                        {items.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">—</p>
                        ) : (
                          <ul className="space-y-3">
                            {items.slice(0, 3).map((r) => (
                              <li key={r.id} className="text-sm text-[#1F2937] flex items-center gap-3 p-3 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                <Badge size="sm" variant={variant} className="rounded-full px-3">{r.type}</Badge>
                                <span className="font-medium">
                                  {r.student && `${r.student.first_name} ${r.student.last_name}`}
                                </span>
                                <span className="text-gray-500 text-xs ml-auto bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100">{formatDate(r.due_date)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* ── 2.1 To'lov qo'shish modal ─────────────────────────────── */}
      <PaymentFormModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        initial={null}
        onSubmit={handlePaymentSubmit}
        onSubmitMultiple={handlePaymentSubmitMultiple}
        loading={createPayment.isPending}
      />

      {/* ── 2.2 Davomat: groups list modal ────────────────────────── */}
      <Modal
        open={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        title="Davomat guruhni tanlang"
      >
        {groupsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : activeGroups.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Faol guruh topilmadi</p>
        ) : (
          <div className="space-y-2">
            {activeGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setAttendanceModalOpen(false);
                  navigate(`/groups/${g.id}`);
                }}
                className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100 hover:border-[#3B82F6]/30 hover:bg-blue-50/40 transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: g.color ? `${g.color}20` : '#EFF6FF' }}
                  >
                    <GraduationCap
                      className="w-5 h-5"
                      style={{ color: g.color ?? '#3B82F6' }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1F2937]">{g.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {g.lesson_time} · {g.students_count ?? g.total_students ?? 0} o'quvchi
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#3B82F6] shrink-0" />
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* ── 2.4 O'quvchi qo'shish modal ───────────────────────────── */}
      <StudentFormModal
        open={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        initial={null}
        onSubmit={handleStudentSubmit}
        loading={createStudent.isPending || addStudentToGroup.isPending}
      />

      {/* ── Qarzdorlar modal ───────────────────────────────────────── */}
      <DebtorsModal
        open={debtorsModalOpen}
        onClose={() => setDebtorsModalOpen(false)}
        debtors={debtorsList}
      />
    </div>
  );
}

// ─── Debtors Modal ────────────────────────────────────────────────────────────

function DebtorsModal({
  open,
  onClose,
  debtors: rawDebtors,
}: {
  open: boolean;
  onClose: () => void;
  debtors: Debtor[];
}) {
  const debtors = Array.isArray(rawDebtors) ? rawDebtors : [];
  if (!open) return null;

  const totalDebt = debtors.reduce((s, d) => s + d.total_debt, 0);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(16);
    doc.text("TeachFlow — Qarzdorlar ro'yxati", pageW / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 15, 25);
    autoTable(doc, {
      head: [["O'quvchi", 'Guruh', "Qarz (so'm)"]],
      body: debtors.map((d) => [
        `${d.student?.first_name ?? ''} ${d.student?.last_name ?? ''}`,
        d.group?.name ?? '',
        formatCurrency(d.total_debt),
      ]),
      startY: 35,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9 },
      foot: [['', 'Jami:', formatCurrency(totalDebt)]],
      footStyles: { fontStyle: 'bold' },
    });
    doc.save(`qarzdorlar-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportExcel = () => {
    const data = debtors.map((d) => ({
      "O'quvchi": `${d.student?.first_name ?? ''} ${d.student?.last_name ?? ''}`,
      Guruh: d.group?.name ?? '',
      "Qarz (so'm)": d.total_debt,
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Qarzdorlar');
    writeFile(wb, `qarzdorlar-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md bg-white sm:rounded-[28px] rounded-t-[28px] overflow-hidden flex flex-col"
        style={{
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.18)',
          animation: 'modalPop 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#e5e5ea]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-[#F5F5F7]">
          <div>
            <h2 className="text-[17px] font-bold text-[#1c1c1e]">Qarzdorlar ro'yxati</h2>
            <p className="text-[12px] text-[#8e8e93] mt-0.5">{debtors.length} nafar o'quvchi</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
          >
            <X className="w-4 h-4 text-[#8e8e93]" />
          </button>
        </div>

        {/* Total debt banner */}
        <div
          className="mx-6 mt-4 flex items-center justify-between px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.15)' }}
        >
          <span className="text-[13px] font-medium text-[#c0392b]">Jami qarzdorlik</span>
          <span className="text-[16px] font-bold text-[#FF3B30]">-{formatCurrency(totalDebt)}</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">
          {debtors.length === 0 ? (
            <p className="text-center text-[14px] text-[#8e8e93] py-8">Qarzdorlar yo'q</p>
          ) : (
            debtors.map((debtor) => {
              const hue = ((debtor.student_id?.charCodeAt(5) ?? 0) * 47) % 360;
              return (
                <div
                  key={debtor.student_id}
                  className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: `hsl(${hue},55%,55%)` }}
                  >
                    {debtor.student?.first_name?.[0]}{debtor.student?.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">
                      {debtor.student?.first_name} {debtor.student?.last_name}
                    </p>
                    <p className="text-[12px] text-[#8e8e93] truncate">{debtor.group?.name}</p>
                  </div>
                  <p className="text-[14px] font-bold text-[#FF3B30] shrink-0">
                    -{formatCurrency(debtor.total_debt)}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Export buttons */}
        <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-3">
          <button
            onClick={handleExportPDF}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#F5F5F7] text-[13px] font-semibold text-[#1c1c1e] transition-all duration-200 hover:bg-[#EBEBEB] active:scale-95"
          >
            <FileDown className="w-4 h-4 text-[#FF3B30]" />
            PDF export
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#F5F5F7] text-[13px] font-semibold text-[#1c1c1e] transition-all duration-200 hover:bg-[#EBEBEB] active:scale-95"
          >
            <FileDown className="w-4 h-4 text-[#34C759]" />
            Excel export
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
