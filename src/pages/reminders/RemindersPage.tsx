import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, X, Bell, Clock, AlertCircle, CheckCircle, Search,
  ChevronRight, CalendarDays, Inbox,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { useReminders, useRemindersSummary, useCreateReminder } from '../../hooks/useReminders';
import * as remindersAPI from '../../api/reminders';
import { useStudents } from '../../hooks/useStudents';
import type { Reminder, ReminderCreatePayload, ReminderType } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

type ReminderStatus = 'overdue' | 'due_today' | 'upcoming';

function getReminderStatus(reminder: Reminder): ReminderStatus {
  const today = getTodayDate();
  if (reminder.due_date < today) return 'overdue';
  if (reminder.due_date === today) return 'due_today';
  return 'upcoming';
}

const STATUS_META: Record<ReminderStatus, { label: string; color: string; bg: string }> = {
  overdue:   { label: "Muddati o'tgan", color: '#FF3B30', bg: 'rgba(255,59,48,0.10)' },
  due_today: { label: 'Bugun',          color: '#FF9500', bg: 'rgba(255,149,0,0.10)' },
  upcoming:  { label: 'Kelgusida',      color: '#007AFF', bg: 'rgba(0,122,255,0.10)' },
};

const TYPE_META: Record<ReminderType, { label: string; icon: React.ReactNode }> = {
  promised_payment: { label: "Va'da qilingan to'lov", icon: <Clock className="w-3.5 h-3.5" /> },
  debt_due:         { label: 'Qarz muddati',          icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getAvatarHue(id: string): number {
  return ((id?.charCodeAt(5) ?? 0) * 47) % 360;
}

type FilterType = 'all' | 'overdue' | 'today' | 'upcoming';

// ─── Main page ────────────────────────────────────────────────────────────────

export function RemindersPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const { data: reminders = [], isLoading } = useReminders();
  const { data: summary } = useRemindersSummary();

  const filteredReminders = useMemo(() => {
    let list = reminders.filter((r) => r.status !== 'archived');
    if (filter === 'overdue') list = list.filter((r) => getReminderStatus(r) === 'overdue');
    else if (filter === 'today') list = list.filter((r) => getReminderStatus(r) === 'due_today');
    else if (filter === 'upcoming') list = list.filter((r) => getReminderStatus(r) === 'upcoming');
    return list.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [reminders, filter]);

  const handleArchive = async (id: string) => {
    setArchivingId(id);
    try {
      await remindersAPI.archiveReminder(id);
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    } catch {
      // silent
    } finally {
      setArchivingId(null);
    }
  };

  const overdueCount  = summary?.overdue?.length ?? 0;
  const todayCount    = summary?.today?.length ?? 0;
  const upcomingCount = summary?.upcoming?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Sidebar />
      <main className="md:pl-[280px] pb-24 md:pb-8">
        <Header />

        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

          {/* ── Page header ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-bold text-[#1c1c1e] tracking-tight">Eslatmalar</h1>
              <p className="text-[13px] text-[#8e8e93] mt-0.5">
                {new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' })}
              </p>
            </div>
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-white text-[14px] font-semibold transition-all duration-200 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #0077B6 0%, #0096C7 100%)',
                boxShadow: '0 4px 16px rgba(0,119,182,0.35)',
              }}
            >
              <Plus className="w-4 h-4" />
              Eslatma qo'shish
            </button>
          </div>

          {/* ── Summary cards ────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Muddati o'tgan", count: overdueCount, color: '#FF3B30', bg: 'rgba(255,59,48,0.08)', filterKey: 'overdue' as FilterType },
              { label: 'Bugun',          count: todayCount,   color: '#FF9500', bg: 'rgba(255,149,0,0.08)',  filterKey: 'today' as FilterType },
              { label: 'Kelgusida',      count: upcomingCount,color: '#007AFF', bg: 'rgba(0,122,255,0.08)', filterKey: 'upcoming' as FilterType },
            ].map((card) => (
              <button
                key={card.filterKey}
                onClick={() => setFilter((f) => f === card.filterKey ? 'all' : card.filterKey)}
                className="flex flex-col items-start px-4 py-4 bg-white rounded-2xl transition-all duration-200 active:scale-[0.97] text-left"
                style={{
                  boxShadow: filter === card.filterKey
                    ? `0 0 0 2px ${card.color}40, 0 4px 16px rgba(0,0,0,0.08)`
                    : '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: card.bg, color: card.color }}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <p
                  className="text-[22px] font-bold tabular-nums leading-none"
                  style={{ color: '#1c1c1e' }}
                >
                  {card.count}
                </p>
                <p className="text-[11px] text-[#8e8e93] font-medium mt-1 leading-tight">
                  {card.label}
                </p>
              </button>
            ))}
          </div>

          {/* ── Filter chips ─────────────────────────────────────────────── */}
          <div className="flex gap-2 flex-wrap">
            {([
              { key: 'all'      as FilterType, label: 'Hammasi' },
              { key: 'overdue'  as FilterType, label: "Muddati o'tgan" },
              { key: 'today'    as FilterType, label: 'Bugun' },
              { key: 'upcoming' as FilterType, label: 'Kelgusida' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="px-4 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-200"
                style={{
                  background: filter === key ? '#0077B6' : '#fff',
                  color: filter === key ? '#fff' : '#8e8e93',
                  boxShadow: filter === key
                    ? '0 4px 12px rgba(0,119,182,0.28)'
                    : '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── List ─────────────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredReminders.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
              <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-[#c7c7cc]" />
              </div>
              <p className="text-[15px] font-semibold text-[#1c1c1e]">Eslatmalar yo'q</p>
              <p className="text-[13px] text-[#8e8e93] mt-1 mb-4">Yangi eslatma qo'shish uchun tugmani bosing</p>
              <button
                onClick={() => setFormOpen(true)}
                className="px-5 py-2.5 rounded-2xl text-white text-[13px] font-semibold"
                style={{ background: '#0077B6', boxShadow: '0 4px 14px rgba(0,119,182,0.35)' }}
              >
                Eslatma qo'shish
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredReminders.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  archiving={archivingId === reminder.id}
                  onArchive={() => handleArchive(reminder.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <AddReminderModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}

// ─── Reminder card ─────────────────────────────────────────────────────────────

function ReminderCard({
  reminder,
  archiving,
  onArchive,
}: {
  reminder: Reminder;
  archiving: boolean;
  onArchive: () => void;
}) {
  const status = getReminderStatus(reminder);
  const statusMeta = STATUS_META[status];
  const typeMeta = TYPE_META[reminder.type] ?? TYPE_META.debt_due;
  const hue = getAvatarHue(reminder.student_id ?? '');

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl transition-all duration-200"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ background: `hsl(${hue},55%,55%)` }}
      >
        {reminder.student?.first_name?.[0]}{reminder.student?.last_name?.[0]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">
          {reminder.student?.first_name} {reminder.student?.last_name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[#c7c7cc]">{typeMeta.icon}</span>
          <span className="text-[12px] text-[#8e8e93]">{typeMeta.label}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold"
            style={{ color: statusMeta.color, background: statusMeta.bg }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusMeta.color }} />
            {statusMeta.label}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[#8e8e93]">
            <CalendarDays className="w-3 h-3" />
            {formatDueDate(reminder.due_date)}
          </span>
        </div>
      </div>

      {/* Archive */}
      <button
        onClick={onArchive}
        disabled={archiving}
        className="flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 shrink-0 disabled:opacity-40"
        style={{ background: 'rgba(52,199,89,0.10)', color: '#34C759' }}
        title="Arxivlash"
      >
        {archiving ? (
          <span className="w-3 h-3 border-2 border-[#34C759] border-t-transparent rounded-full animate-spin" />
        ) : (
          <CheckCircle className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

// ─── Add reminder modal ────────────────────────────────────────────────────────

function AddReminderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: students = [] } = useStudents();
  const createReminder = useCreateReminder();

  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [type, setType] = useState<ReminderType>('promised_payment');
  const [dueDate, setDueDate] = useState(getTodayDate());
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeStudents = students.filter((s) => !s.is_archived);
  const selectedStudent = activeStudents.find((s) => s.id === selectedStudentId) ?? null;

  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();
    if (!q) return activeStudents.slice(0, 6);
    return activeStudents
      .filter(
        (s) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [studentSearch, activeStudents]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const reset = () => {
    setStudentSearch('');
    setSelectedStudentId('');
    setType('promised_payment');
    setDueDate(getTodayDate());
    setShowDropdown(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !dueDate) return;

    const payload: ReminderCreatePayload = {
      student_id: selectedStudentId,
      type,
      due_date: dueDate,
    };

    createReminder.mutate(payload, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  if (!open) return null;

  const canSubmit = !!selectedStudentId && !!dueDate;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div
        className="relative w-full sm:max-w-md bg-white sm:rounded-[28px] rounded-t-[28px] overflow-hidden flex flex-col"
        style={{
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.18)',
          animation: 'modalPop 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#e5e5ea]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3">
          <h2 className="text-[17px] font-bold text-[#1c1c1e]">Yangi eslatma</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
          >
            <X className="w-4 h-4 text-[#8e8e93]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">

          {/* ── Student ──────────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">
              O'quvchi
            </p>

            {selectedStudent ? (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,122,255,0.06), rgba(94,92,230,0.06))',
                  border: '1.5px solid rgba(0,122,255,0.15)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: `hsl(${getAvatarHue(selectedStudent.id)},55%,55%)` }}
                >
                  {selectedStudent.first_name[0]}{selectedStudent.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </p>
                  <p className="text-[12px] text-[#8e8e93]">#{selectedStudent.student_code}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedStudentId(''); setStudentSearch(''); setTimeout(() => searchRef.current?.focus(), 50); }}
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(0,0,0,0.08)' }}
                >
                  <X className="w-3 h-3 text-[#3c3c43]" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e93]" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Ism yoki familiya bilan qidiring..."
                  value={studentSearch}
                  onChange={(e) => { setStudentSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-[13px] text-[#1c1c1e] placeholder-[#c7c7cc] outline-none"
                  style={{ background: '#F5F5F7' }}
                />
                {showDropdown && filteredStudents.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-20 w-full mt-1.5 bg-white rounded-2xl overflow-hidden"
                    style={{
                      boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.12)',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    {filteredStudents.map((st, idx) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => { setSelectedStudentId(st.id); setStudentSearch(''); setShowDropdown(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F5F5F7] transition-colors text-left"
                        style={{ borderTop: idx > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: `hsl(${getAvatarHue(st.id)},55%,55%)` }}
                        >
                          {st.first_name[0]}{st.last_name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#1c1c1e]">
                            {st.first_name} {st.last_name}
                          </p>
                          <p className="text-[11px] text-[#8e8e93]">#{st.student_code}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#c7c7cc] ml-auto shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Type ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">
              Eslatma turi
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TYPE_META) as [ReminderType, typeof TYPE_META[ReminderType]][]).map(([value, meta]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className="flex items-center gap-2 px-3.5 py-3 rounded-2xl text-[13px] font-medium transition-all duration-200 text-left"
                  style={{
                    background: type === value ? '#0077B6' : '#F5F5F7',
                    color: type === value ? '#fff' : '#3c3c43',
                    boxShadow: type === value ? '0 4px 12px rgba(0,119,182,0.28)' : 'none',
                  }}
                >
                  {meta.icon}
                  <span className="leading-tight">{meta.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Due date ─────────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">
              Muddat sanasi
            </p>
            <div
              className="relative flex items-center rounded-2xl overflow-hidden"
              style={{ background: '#F5F5F7' }}
            >
              <CalendarDays className="absolute left-4 w-4 h-4 text-[#8e8e93] pointer-events-none" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3.5 bg-transparent text-[14px] font-medium text-[#1c1c1e] outline-none"
              />
            </div>
          </div>

          {/* ── Buttons ──────────────────────────────────────────────── */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold transition-all duration-200"
              style={{ background: '#F5F5F7', color: '#3c3c43' }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={!canSubmit || createReminder.isPending}
              className="py-3.5 rounded-2xl text-white text-[14px] font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                flex: 2,
                background: canSubmit && !createReminder.isPending
                  ? 'linear-gradient(135deg, #0077B6 0%, #0096C7 100%)'
                  : '#e5e5ea',
                color: canSubmit ? '#fff' : '#8e8e93',
                boxShadow: canSubmit ? '0 4px 16px rgba(0,119,182,0.35)' : 'none',
              }}
            >
              {createReminder.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
