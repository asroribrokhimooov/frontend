import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/shared/EmptyState';
import { useGroups } from '../../hooks/useGroups';
import { useGroupAttendance, useCreateAttendanceBulk } from '../../hooks/useAttendance';
import { useStudents } from '../../hooks/useStudents';
import type { AttendanceStatus } from '../../types';

type FilterView = 'daily' | 'monthly';
const ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-800 hover:bg-green-200',
  late: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  absent: 'bg-red-100 text-red-800 hover:bg-red-200',
  excused: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
};

const STATUS_BADGES: Record<AttendanceStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  present: 'success',
  late: 'warning',
  absent: 'danger',
  excused: 'neutral',
};

export function AttendancePage() {
  const { t } = useTranslation();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [view, setView] = useState<FilterView>('daily');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});

  const { data: groups = [] } = useGroups();
  const { data: students = [] } = useStudents();
  const { data: existingAttendance = [], isLoading: attendanceLoading } = useGroupAttendance(
    selectedGroupId || undefined
  );
  const createAttendance = useCreateAttendanceBulk();

  const activeGroups = groups.filter((g) => !g.is_archived);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const groupStudents = selectedGroup
    ? students.filter((s) => s.groups?.some((g) => g.id === selectedGroupId) && !s.is_archived)
    : [];

  // Initialize attendance map with existing records
  const filteredAttendance = useMemo(() => {
    if (!selectedGroupId) return [];
    return existingAttendance.filter(
      (a) => a.date === selectedDate && a.group_id === selectedGroupId
    );
  }, [existingAttendance, selectedGroupId, selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSave = () => {
    if (!selectedGroupId) return;

    const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
      group_id: selectedGroupId,
      student_id: studentId,
      date: selectedDate,
      status,
    }));

    if (records.length === 0) return;

    createAttendance.mutate(
      { records },
      {
        onSuccess: () => {
          setAttendanceMap({});
        },
      }
    );
  };

  const handlePrevDate = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDate = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handlePrevMonth = () => {
    const date = new Date(selectedDate);
    date.setMonth(date.getMonth() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextMonth = () => {
    const date = new Date(selectedDate);
    date.setMonth(date.getMonth() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  // Get daily attendance record
  const getTodayAttendance = (studentId: string): AttendanceStatus | undefined => {
    return (
      attendanceMap[studentId] ||
      filteredAttendance.find((a) => a.student_id === studentId)?.status
    );
  };

  const displayDate = new Date(selectedDate).toLocaleDateString('uz-UZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const displayMonth = new Date(selectedDate).toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-[280px] pb-20 md:pb-0">
        <Header />
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-[#1F2937]">{t('nav.attendance')}</h1>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            {(['daily', 'monthly'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  view === v
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {v === 'daily' ? 'Kunlik' : 'Oylik'}
              </button>
            ))}
          </div>

          {/* Group Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#1F2937] mb-2">
              {t('students.groups')} *
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setAttendanceMap({});
              }}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-[#1F2937] focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
            >
              <option value="">{t('common.select')}</option>
              {activeGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {selectedGroupId && (
            <>
              {view === 'daily' && (
                <>
                  {/* Date Navigation */}
                  <div className="flex items-center justify-between mb-6 gap-4">
                    <Button variant="ghost" size="sm" onClick={handlePrevDate}>
                      ←
                    </Button>
                    <div className="text-center">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-[#1F2937] focus:border-primary-500 outline-none"
                      />
                      <p className="text-sm text-gray-600 mt-2">{displayDate}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleNextDate}>
                      →
                    </Button>
                  </div>

                  {/* Students List */}
                  {attendanceLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} padding="md" className="h-20 animate-pulse" />
                      ))}
                    </div>
                  ) : groupStudents.length === 0 ? (
                    <Card padding="lg">
                      <EmptyState
                        icon={<Calendar className="w-8 h-8" />}
                        title={t('common.noData')}
                        description="Guruhda o'quvchi topilmadi"
                      />
                    </Card>
                  ) : (
                    <div className="space-y-3 mb-6">
                      {groupStudents.map((student) => {
                        const status = getTodayAttendance(student.id);
                        return (
                          <Card
                            key={student.id}
                            padding="md"
                            className="flex flex-col sm:flex-row sm:items-center gap-4"
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-[#1F2937]">
                                {student.first_name} {student.last_name}
                              </p>
                              <p className="text-sm text-gray-500">{student.phone || '—'}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {ATTENDANCE_STATUSES.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, s)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    status === s ? STATUS_COLORS[s] : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {t(`attendance.status.${s}`)}
                                </button>
                              ))}
                            </div>
                            {status && (
                              <Badge variant={STATUS_BADGES[status]} size="sm">
                                {t(`attendance.status.${status}`)}
                              </Badge>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Save Button */}
                  {Object.keys(attendanceMap).length > 0 && (
                    <Button
                      onClick={handleSave}
                      loading={createAttendance.isPending}
                      className="w-full"
                    >
                      {t('common.save')}
                    </Button>
                  )}
                </>
              )}

              {view === 'monthly' && (
                <>
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-6">
                    <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                      ←
                    </Button>
                    <h2 className="text-lg font-semibold text-[#1F2937]">{displayMonth}</h2>
                    <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                      →
                    </Button>
                  </div>

                  {/* Monthly Attendance Table */}
                  {attendanceLoading ? (
                    <Card padding="lg" className="h-64 animate-pulse" />
                  ) : (
                    <Card padding="md" className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-[#1F2937]">
                              O'quvchi
                            </th>
                            {getDaysInMonth(selectedDate).map((day) => (
                              <th
                                key={day}
                                className="text-center py-3 px-2 font-semibold text-gray-600 text-xs"
                              >
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {groupStudents.map((student) => (
                            <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-[#1F2937]">
                                {student.first_name} {student.last_name}
                              </td>
                              {getDaysInMonth(selectedDate).map((day) => {
                                const dateStr = `${selectedDate.split('-')[0]}-${selectedDate.split('-')[1]}-${String(day).padStart(2, '0')}`;
                                const attendance = existingAttendance.find(
                                  (a) => a.student_id === student.id && a.date === dateStr
                                );
                                return (
                                  <td key={day} className="text-center py-3 px-2">
                                    {attendance && (
                                      <Badge variant={STATUS_BADGES[attendance.status]} size="sm">
                                        {attendance.status === 'present'
                                          ? '✓'
                                          : attendance.status === 'late'
                                            ? '~'
                                            : attendance.status === 'absent'
                                              ? '✕'
                                              : '○'}
                                      </Badge>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function getDaysInMonth(dateStr: string): number[] {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
}
