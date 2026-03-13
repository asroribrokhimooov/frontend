import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  Calendar,
  ClipboardList,
  Users,
  MessageSquare,
} from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useStudent } from '../../hooks/useStudents';
import { api } from '../../api/axios';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import type { Payment, Attendance } from '../../types';

function getInitials(firstName: string, lastName: string): string {
  const f = (firstName ?? '').trim().slice(0, 1);
  const l = (lastName ?? '').trim().slice(0, 1);
  return (f + l).toUpperCase() || '?';
}

type TabKey = 'general' | 'payments' | 'attendance';

export function StudentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>('general');

  const { data: student, isLoading: studentLoading, isError: studentError } = useStudent(id);

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', 'student', id],
    queryFn: async (): Promise<Payment[]> => {
      const res = await api.get<Payment[] | { data: Payment[] }>('/payments', {
        params: { student_id: id },
      });
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw as { data: Payment[] }).data ?? [];
    },
    enabled: !!id,
  });

  const { data: attendanceList = [] } = useQuery({
    queryKey: ['attendance', 'student', id],
    queryFn: async (): Promise<Attendance[]> => {
      const res = await api.get<Attendance[] | { data: Attendance[] }>(`/attendance/student/${id}`);
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw as { data: Attendance[] }).data ?? [];
    },
    enabled: !!id,
  });

  const lastPayment = payments.length > 0
    ? payments.sort(
        (a, b) =>
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      )[0]
    : null;
  const presentCount = attendanceList.filter(
    (a) => a.status === 'present' || a.status === 'late'
  ).length;
  const attendancePercent =
    attendanceList.length > 0
      ? Math.round((presentCount / attendanceList.length) * 100)
      : 0;
  const groupName =
    student?.groups?.length && student.groups[0]
      ? student.groups[0].name
      : t('students.noGroup');

  if (studentLoading || !id) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="md:pl-[280px] pb-20 md:pb-0">
          <Header />
          <div className="p-6 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (studentError || !student) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="md:pl-[280px] pb-20 md:pb-0">
          <Header />
          <div className="p-6">
            <Card className="border-red-200 bg-red-50">
              <p className="text-red-700">{t('common.error')}</p>
              <Link to="/students" className="text-primary-600 hover:underline mt-2 inline-block">
                {t('common.back')}
              </Link>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-[280px] pb-20 md:pb-0">
        <Header />
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {/* Profile card */}
          <Card padding="md" hover className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl shrink-0">
              {getInitials(student.first_name, student.last_name)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[#1F2937]">
                {student.first_name} {student.last_name}
              </h1>
              <p className="text-sm text-gray-500 font-mono">{student.student_code}</p>
              <p className="text-sm text-gray-600">{student.phone || '—'}</p>
              <p className="text-sm text-gray-500">
                {t('students.parentPhone')}: {student.parent_phone || '—'}
              </p>
              <p className="text-sm text-gray-500">
                {t('students.groups')}:{' '}
                {student.groups?.length
                  ? student.groups.map((g) => g.name).join(', ')
                  : t('students.noGroup')}
              </p>
            </div>
            <Link to={`/messages?to=${student.id}`}>
              <Button leftIcon={<MessageSquare className="w-4 h-4" />}>
                {t('students.sendMessage')}
              </Button>
            </Link>
          </Card>

          {/* KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card padding="md" hover className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-primary-500" />
              <div>
                <p className="text-sm text-gray-500">{t('students.balance')}</p>
                <p className="text-xl font-bold text-[#1F2937]">
                  {formatCurrency(student.balance ?? 0)}
                </p>
              </div>
            </Card>
            <Card padding="md" hover className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">{t('students.lastPayment')}</p>
                <p className="text-lg font-bold text-[#1F2937]">
                  {lastPayment
                    ? formatDate(lastPayment.created_at || '')
                    : '—'}
                </p>
              </div>
            </Card>
            <Card padding="md" hover className="flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-sm text-gray-500">{t('groups.attendancePercent')}</p>
                <p className="text-xl font-bold text-[#1F2937]">{attendancePercent}%</p>
              </div>
            </Card>
            <Card padding="md" hover className="flex items-center gap-3">
              <Users className="w-8 h-8 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">{t('students.groups')}</p>
                <p className="text-lg font-bold text-[#1F2937] truncate">{groupName}</p>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            {(
              [
                ['general', t('students.tabGeneral')],
                ['payments', t('students.tabPayments')],
                ['attendance', t('students.tabAttendance')],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-[#1F2937]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'general' && (
            <Card padding="md">
              <p className="text-sm text-gray-600">
                {student.first_name} {student.last_name} · {student.student_code}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {t('students.phone')}: {student.phone || '—'}
              </p>
              <p className="text-sm text-gray-500">
                {t('students.parentName')}: {student.parent_name || '—'}
              </p>
              <p className="text-sm text-gray-500">
                {t('students.parentPhone')}: {student.parent_phone || '—'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {t('students.groups')}:{' '}
                {student.groups?.length
                  ? student.groups.map((g) => g.name).join(', ')
                  : t('students.noGroup')}
              </p>
            </Card>
          )}

          {tab === 'payments' && (
            <Card padding="md">
              {payments.length === 0 ? (
                <p className="text-gray-500">{t('common.noData')}</p>
              ) : (
                <ul className="space-y-2">
                  {payments.slice(0, 20).map((p) => (
                    <li
                      key={p.id}
                      className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                    >
                      <span>{formatDate(p.created_at || '')}</span>
                      <span className="font-medium">{formatCurrency(p.amount)}</span>
                      <span className="text-sm text-gray-500">{p.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === 'attendance' && (
            <Card padding="md">
              {attendanceList.length === 0 ? (
                <p className="text-gray-500">{t('common.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200">
                        <th className="py-2 pr-4">{t('common.date')}</th>
                        <th className="py-2">{t('common.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceList.slice(0, 30).map((a) => (
                        <tr key={a.id} className="border-b border-gray-100">
                          <td className="py-2 pr-4">{formatDate(a.date)}</td>
                          <td className="py-2">{a.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
