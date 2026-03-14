import { useState, useMemo } from 'react';
import { Bell, Users, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { useReminders } from '../hooks/useReminders';
import { formatCurrency } from '../utils/formatCurrency';
import type { Reminder } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'debt_due' | 'promised_payment' | 'lesson';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function studentName(r: Reminder): string {
  if (r.student) return `${r.student.first_name} ${r.student.last_name}`;
  return '—';
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

// ─── Reminder Card ────────────────────────────────────────────────────────────

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const overdue = reminder.due_date ? isOverdue(reminder.due_date) : false;

  if (reminder.type === 'debt_due') {
    return (
      <div
        className="bg-white rounded-2xl px-4 py-4"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: overdue ? 'rgba(255,59,48,0.10)' : 'rgba(255,149,0,0.10)' }}
          >
            <AlertCircle className="w-5 h-5" style={{ color: overdue ? '#FF3B30' : '#FF9500' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">{studentName(reminder)}</p>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0"
                style={{
                  background: overdue ? 'rgba(255,59,48,0.10)' : 'rgba(255,149,0,0.10)',
                  color: overdue ? '#FF3B30' : '#FF9500',
                }}
              >
                {overdue ? 'Muddati o\'tgan' : 'Qarz'}
              </span>
            </div>
            {(reminder as Reminder & { amount?: number }).amount != null && (
              <p className="text-[13px] font-bold text-[#FF3B30]">
                {formatCurrency((reminder as Reminder & { amount?: number }).amount!)}
              </p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-[#8e8e93]" />
              <p className="text-[11px] text-[#8e8e93]">Muddat: {formatDate(reminder.due_date)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (reminder.type === 'promised_payment') {
    return (
      <div
        className="bg-white rounded-2xl px-4 py-4"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0,122,255,0.10)' }}
          >
            <CheckCircle2 className="w-5 h-5 text-[#007AFF]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">{studentName(reminder)}</p>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0"
                style={{ background: 'rgba(0,122,255,0.10)', color: '#007AFF' }}
              >
                Va'da
              </span>
            </div>
            {(reminder as Reminder & { amount?: number }).amount != null && (
              <p className="text-[13px] font-bold text-[#007AFF]">
                {formatCurrency((reminder as Reminder & { amount?: number }).amount!)}
              </p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-[#8e8e93]" />
              <p className="text-[11px] text-[#8e8e93]">Va'da sanasi: {formatDate(reminder.due_date)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // lesson type
  const lessonReminder = reminder as Reminder & { group_name?: string; lesson_time?: string; lesson_day?: string };
  return (
    <div
      className="bg-white rounded-2xl px-4 py-4"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(52,199,89,0.10)' }}
        >
          <Calendar className="w-5 h-5 text-[#34C759]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">
              {lessonReminder.group_name ?? 'Guruh'}
            </p>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0"
              style={{ background: 'rgba(52,199,89,0.10)', color: '#34C759' }}
            >
              Dars
            </span>
          </div>
          {(lessonReminder.lesson_time || lessonReminder.lesson_day) && (
            <p className="text-[13px] text-[#3c3c43]">
              {lessonReminder.lesson_day && <span>{lessonReminder.lesson_day} · </span>}
              {lessonReminder.lesson_time && <span>{lessonReminder.lesson_time}</span>}
            </p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3 text-[#8e8e93]" />
            <p className="text-[11px] text-[#8e8e93]">Sana: {formatDate(reminder.due_date)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterType }) {
  const messages: Record<FilterType, { icon: React.ReactNode; title: string; desc: string }> = {
    all:               { icon: <Bell className="w-8 h-8 text-[#c7c7cc]" />,        title: "Eslatmalar yo'q",     desc: "Hozircha hech qanday eslatma mavjud emas" },
    debt_due:          { icon: <AlertCircle className="w-8 h-8 text-[#c7c7cc]" />, title: "Qarzdorlar yo'q",     desc: "Muddati yetgan qarzlar topilmadi" },
    promised_payment:  { icon: <CheckCircle2 className="w-8 h-8 text-[#c7c7cc]" />,title: "Va'dalar yo'q",       desc: "To'lov va'da qilgan o'quvchilar yo'q" },
    lesson:            { icon: <Calendar className="w-8 h-8 text-[#c7c7cc]" />,    title: "Dars eslatmalari yo'q", desc: "Yaqin darslar bo'yicha eslatma yo'q" },
  };
  const { icon, title, desc } = messages[filter];
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-16 h-16 rounded-2xl bg-[#F5F5F7] flex items-center justify-center">
        {icon}
      </div>
      <p className="text-[15px] font-semibold text-[#1c1c1e]">{title}</p>
      <p className="text-[13px] text-[#8e8e93] text-center max-w-xs">{desc}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function RemindersPage() {
  const { data: reminders = [], isLoading } = useReminders();
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return reminders;
    return reminders.filter((r) => r.type === filter);
  }, [reminders, filter]);

  const counts = useMemo(() => ({
    all:              reminders.length,
    debt_due:         reminders.filter((r) => r.type === 'debt_due').length,
    promised_payment: reminders.filter((r) => r.type === 'promised_payment').length,
    lesson:           reminders.filter((r) => r.type === 'lesson').length,
  }), [reminders]);

  const FILTERS: Array<{ key: FilterType; label: string; icon: React.ReactNode; color: string }> = [
    { key: 'all',              label: 'Hammasi',   icon: <Bell className="w-4 h-4" />,          color: '#1c1c1e' },
    { key: 'debt_due',         label: 'Qarzdorlar',icon: <AlertCircle className="w-4 h-4" />,   color: '#FF3B30' },
    { key: 'promised_payment', label: "Va'da",     icon: <CheckCircle2 className="w-4 h-4" />,  color: '#007AFF' },
    { key: 'lesson',           label: 'Darslar',   icon: <Calendar className="w-4 h-4" />,      color: '#34C759' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Sidebar />
      <main className="md:pl-[280px] pb-24 md:pb-8">
        <Header />
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-[#1c1c1e] tracking-tight">Eslatmalar</h1>
              <p className="text-[13px] text-[#8e8e93] mt-0.5">
                {reminders.length > 0 ? `${reminders.length} ta eslatma` : 'Hech qanday eslatma yo\'q'}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(0,122,255,0.10)' }}
            >
              <Bell className="w-5 h-5 text-[#007AFF]" />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const count = counts[f.key];
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold shrink-0 transition-all duration-200"
                  style={{
                    background: active ? '#1c1c1e' : '#fff',
                    color: active ? '#fff' : '#8e8e93',
                    boxShadow: active ? '0 4px 12px rgba(0,0,0,0.18)' : '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <span style={{ color: active ? '#fff' : f.color }}>{f.icon}</span>
                  {f.label}
                  {count > 0 && (
                    <span
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded-lg min-w-[18px] text-center"
                      style={{
                        background: active ? 'rgba(255,255,255,0.2)' : `${f.color}18`,
                        color: active ? '#fff' : f.color,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl px-4 py-4 animate-pulse"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#F5F5F7]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-[#F5F5F7] rounded-lg w-2/3" />
                      <div className="h-3 bg-[#F5F5F7] rounded-lg w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="space-y-3">
              {/* Overdue section */}
              {filter === 'all' && filtered.some((r) => r.due_date && isOverdue(r.due_date)) && (
                <>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-[#FF3B30]" />
                    <p className="text-[11px] font-bold text-[#FF3B30] uppercase tracking-wider">Muddati o'tgan</p>
                  </div>
                  {filtered
                    .filter((r) => r.due_date && isOverdue(r.due_date))
                    .map((r) => <ReminderCard key={r.id} reminder={r} />)}
                  {filtered.some((r) => !r.due_date || !isOverdue(r.due_date)) && (
                    <div className="flex items-center gap-2 pt-1">
                      <Users className="w-3.5 h-3.5 text-[#8e8e93]" />
                      <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-wider">Kelasi</p>
                    </div>
                  )}
                  {filtered
                    .filter((r) => !r.due_date || !isOverdue(r.due_date))
                    .map((r) => <ReminderCard key={r.id} reminder={r} />)}
                </>
              )}
              {(filter !== 'all' || !filtered.some((r) => r.due_date && isOverdue(r.due_date))) &&
                filtered.map((r) => <ReminderCard key={r.id} reminder={r} />)}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
