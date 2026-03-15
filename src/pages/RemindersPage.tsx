import { useState, useMemo } from 'react';
import { Bell, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { useReminders } from '../hooks/useReminders';
import { formatCurrency } from '../utils/formatCurrency';
import { Pagination } from '../components/ui/Pagination';
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

const ITEMS_PER_PAGE = 30;

export function RemindersPage() {
  const { data: reminders = [], isLoading } = useReminders();
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (filter === 'all') return reminders;
    return reminders.filter((r) => r.type === filter);
  }, [reminders, filter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedFiltered = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

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
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden border border-white">
              <div className="divide-y divide-gray-100/80">
                {paginatedFiltered.map((reminder, idx) => {
                  const overdue = reminder.due_date ? isOverdue(reminder.due_date) : false;
                  const statusColor = overdue ? '#FF3B30' : reminder.type === 'promised_payment' ? '#007AFF' : reminder.type === 'lesson' ? '#34C759' : '#FF9500';
                  const statusLabel = overdue ? "Muddati o'tgan" : reminder.type === 'promised_payment' ? "Va'da" : reminder.type === 'lesson' ? 'Dars' : 'Qarz';
                  return (
                    <div
                      key={reminder.id}
                      className="group flex items-center gap-3.5 px-5 py-3.5 hover:bg-blue-50/40 transition-all"
                    >
                      <span className="text-xs text-gray-300 font-medium w-5 shrink-0 tabular-nums">
                        {(page - 1) * ITEMS_PER_PAGE + idx + 1}
                      </span>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                        style={{ background: `${statusColor}15` }}
                      >
                        {reminder.type === 'debt_due' ? (
                          <AlertCircle className="w-5 h-5" style={{ color: statusColor }} />
                        ) : reminder.type === 'promised_payment' ? (
                          <CheckCircle2 className="w-5 h-5" style={{ color: statusColor }} />
                        ) : (
                          <Calendar className="w-5 h-5" style={{ color: statusColor }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1F2937] truncate text-sm">
                          {studentName(reminder)}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
                          <span className="text-xs text-gray-400">{formatDate(reminder.due_date)}</span>
                          {(reminder as Reminder & { amount?: number }).amount != null && (
                            <span className="text-xs font-semibold" style={{ color: statusColor }}>
                              {formatCurrency((reminder as Reminder & { amount?: number }).amount!)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0"
                        style={{ background: `${statusColor}15`, color: statusColor }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={filtered.length}
                perPage={ITEMS_PER_PAGE}
                onChange={setPage}
              />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
