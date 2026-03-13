import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Pencil, ChevronLeft, ChevronRight,
  Phone, Hash, CalendarDays, Layers, Archive,
  MessageCircle, Wallet, CheckCircle2, Clock, Copy, Check,
} from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  useStudent,
  useUpdateStudent,
  useArchiveStudent,
} from '../../hooks/useStudents';
import { useCreatePayment } from '../../hooks/usePayments';
import { PaymentFormModal } from '../payments/PaymentFormModal';
import { api } from '../../api/axios';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import type { Payment, Attendance } from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: 'bg-blue-100',   text: 'text-blue-600'   },
  { bg: 'bg-green-100',  text: 'text-green-600'  },
  { bg: 'bg-purple-100', text: 'text-purple-600' },
  { bg: 'bg-amber-100',  text: 'text-amber-600'  },
  { bg: 'bg-pink-100',   text: 'text-pink-600'   },
  { bg: 'bg-teal-100',   text: 'text-teal-600'   },
  { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  { bg: 'bg-rose-100',   text: 'text-rose-600'   },
];

const METHOD_LABEL: Record<string, string> = {
  cash: 'Naqd', card: 'Karta', click: 'Click', transfer: "O'tkazma",
};

const ATTENDANCE_CFG: Record<string, { label: string; bg: string; dot: string }> = {
  present: { label: 'Keldi',      bg: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  late:    { label: 'Kech keldi', bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  absent:  { label: 'Kelmadi',    bg: 'bg-red-100 text-red-700',     dot: 'bg-red-500'   },
  excused: { label: 'Sababli',    bg: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400'  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(first: string, last: string): string {
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase() || '?';
}

function getAvatarColor(name: string) {
  let code = 0;
  for (let i = 0; i < name.length; i++) code += name.charCodeAt(i);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

type TabKey = 'overview' | 'payments' | 'attendance';

// ── Edit Modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  open: boolean;
  onClose: () => void;
  studentId: string;
  initial: { first_name: string; last_name: string; phone: string; parent_phone: string };
}

function EditStudentModal({ open, onClose, studentId, initial }: EditModalProps) {
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [phone, setPhone]             = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [error, setError]             = useState<string | null>(null);
  const update = useUpdateStudent(studentId);

  useEffect(() => {
    if (open) {
      setFirstName(initial.first_name);
      setLastName(initial.last_name);
      setPhone(initial.phone);
      setParentPhone(initial.parent_phone);
      setError(null);
    }
  }, [open, initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim()) { setError('Ism kiritish shart'); return; }
    if (!lastName.trim())  { setError('Familiya kiritish shart'); return; }
    update.mutate(
      {
        first_name:   firstName.trim(),
        last_name:    lastName.trim(),
        phone:        phone.trim() || null,
        parent_phone: parentPhone.trim() || null,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="O'quvchini tahrirlash">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Ism *"      value={firstName}   onChange={(e) => setFirstName(e.target.value)} autoFocus />
        <Input label="Familiya *" value={lastName}    onChange={(e) => setLastName(e.target.value)} />
        <Input label="Telefon raqam" placeholder="+998 __ ___ __ __" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Ota-ona telefon raqami" placeholder="+998 __ ___ __ __" type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Bekor qilish</Button>
          <Button type="submit" loading={update.isPending} className="flex-1">Saqlash</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Archive Confirm Modal ─────────────────────────────────────────────────────

function ArchiveConfirmModal({ open, onConfirm, onCancel, loading }: {
  open: boolean; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <Modal open={open} onClose={onCancel} title="Arxivlashni tasdiqlash">
      <div className="py-2">
        <p className="text-sm text-gray-600 mb-6">
          O'quvchini arxivlashni tasdiqlaysizmi? Arxivlangan o'quvchilar ro'yxatdan ko'rinmaydi.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors border border-red-200"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Arxivlanmoqda...' : 'Tasdiqlash'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Attendance Calendar ───────────────────────────────────────────────────────

interface CalendarProps {
  allAttendance: Attendance[];
  month: Date;
  onPrev: () => void;
  onNext: () => void;
}

function AttendanceCalendar({ allAttendance, month, onPrev, onNext }: CalendarProps) {
  const year       = month.getFullYear();
  const mon        = month.getMonth();
  const monthStr   = `${year}-${String(mon + 1).padStart(2, '0')}`;
  const monthLabel = month.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' });
  const daysInMonth    = new Date(year, mon + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, mon, 1).getDay();

  const byDay: Record<number, string> = {};
  allAttendance.forEach((a) => {
    if (a.date?.startsWith(monthStr)) {
      byDay[parseInt(a.date.split('-')[2], 10)] = a.status;
    }
  });

  const weekDays = ['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sha'];
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={onPrev} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-[#1F2937] capitalize">{monthLabel}</span>
        <button type="button" onClick={onNext} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const status = byDay[day];
          const cfg    = status ? ATTENDANCE_CFG[status] : null;
          return (
            <div
              key={day}
              title={cfg?.label}
              className={`relative flex flex-col items-center justify-center rounded-lg py-2 text-xs font-medium ${cfg ? cfg.bg : 'text-gray-300'}`}
            >
              {day}
              {cfg && <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
            </div>
          );
        })}
      </div>
      {Object.keys(byDay).length === 0 ? (
        <p className="text-center text-sm text-gray-400 mt-4">Bu oyda davomat ma'lumotlari yo'q</p>
      ) : (
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100">
          {Object.values(ATTENDANCE_CFG).map((cfg) => (
            <div key={cfg.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <span className="text-xs text-gray-500">{cfg.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab]                         = useState<TabKey>('overview');
  const [editOpen, setEditOpen]               = useState(false);
  const [archiveOpen, setArchiveOpen]         = useState(false);
  const [paymentOpen, setPaymentOpen]         = useState(false);
  const [copied, setCopied]                   = useState(false);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date());

  const { data: student, isLoading: studentLoading, isError: studentError } = useStudent(id);
  const archive      = useArchiveStudent(id ?? '');
  const createPayment = useCreatePayment();

  // ── Payments ──────────────────────────────────────────────────────────────
  const { data: payments = [], isLoading: paymentsLoading, isError: paymentsError } = useQuery({
    queryKey: ['payments', 'student', id],
    queryFn: async (): Promise<Payment[]> => {
      const res = await api.get<Payment[] | { data: Payment[] }>('/payments', { params: { student_id: id } });
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw as { data: Payment[] }).data ?? [];
    },
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });

  // ── Attendance ────────────────────────────────────────────────────────────
  const { data: allAttendance = [], isLoading: attendanceLoading, isError: attendanceError } = useQuery({
    queryKey: ['attendance', 'student', id],
    queryFn: async (): Promise<Attendance[]> => {
      const res = await api.get<Attendance[] | { data: Attendance[] }>(`/attendance/student/${id}`);
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw as { data: Attendance[] }).data ?? [];
    },
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime()),
    [payments]
  );
  const lastPayment       = sortedPayments[0] ?? null;
  const totalAttendance   = allAttendance.length;
  const presentCount      = allAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  const attendancePercent = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : null;
  const totalPaid         = payments.reduce((sum, p) => sum + p.amount, 0);
  const primaryGroup      = student?.groups?.[0] ?? null;

  function getPaymentStatusInfo() {
    if (!lastPayment) return null;
    const s = lastPayment.status;
    if (s === 'paid' || s === 'prepaid') return { label: "TO'LANGAN", color: 'text-green-600 bg-green-50 border border-green-200' };
    if (s === 'partial')  return { label: 'QISMAN',       color: 'text-amber-600 bg-amber-50 border border-amber-200' };
    if (s === 'promised') return { label: "VA'DA",        color: 'text-orange-600 bg-orange-50 border border-orange-200' };
    return { label: "TO'LANMAGAN", color: 'text-red-600 bg-red-50 border border-red-200' };
  }

  function getPaymentStatusFullText() {
    if (!lastPayment) return { text: "To'lov yo'q", color: 'text-gray-500' };
    const s = lastPayment.status;
    if (s === 'paid' || s === 'prepaid') return { text: "To'liq to'langan", color: 'text-green-600' };
    if (s === 'partial')  return { text: "Qisman to'langan", color: 'text-amber-600' };
    if (s === 'promised') return { text: "Va'da berilgan",   color: 'text-orange-600' };
    return { text: "To'lanmagan", color: 'text-red-600' };
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(student?.student_code ?? '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleArchiveConfirm = () => {
    archive.mutate(undefined, {
      onSuccess: () => {
        setArchiveOpen(false);
        navigate('/students');
      },
    });
  };

  // ── Loading / Error ───────────────────────────────────────────────────────

  if (studentLoading || !id) {
    return (
      <div className="min-h-screen bg-[#F0F4FA]">
        <Sidebar />
        <main className="md:pl-[280px] pb-20 md:pb-0">
          <Header />
          <div className="p-6 flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (studentError || !student) {
    return (
      <div className="min-h-screen bg-[#F0F4FA]">
        <Sidebar />
        <main className="md:pl-[280px] pb-20 md:pb-0">
          <Header />
          <div className="p-6">
            <Card className="border-red-200 bg-red-50 p-6">
              <p className="text-red-700 font-medium">Ma'lumot yuklanmadi, qayta urinib ko'ring</p>
              <Link to="/students" className="text-primary-600 hover:underline mt-2 inline-block text-sm">← Orqaga</Link>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const avatarColor = getAvatarColor(student.first_name + student.last_name);
  const initials    = getInitials(student.first_name, student.last_name);
  const payStatus   = getPaymentStatusInfo();
  const payFull     = getPaymentStatusFullText();

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <Sidebar />
      <main className="md:pl-[280px] pb-20 md:pb-0">
        <Header />
        <div className="p-4 md:p-6 max-w-3xl mx-auto">

          {/* Back */}
          <Link
            to="/students"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1F2937] mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            O'quvchilar ro'yxati
          </Link>

          {/* ── Profile Header Card ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] p-5 mb-4">
            <div className="flex items-start gap-4">

              {/* Avatar with online dot */}
              <div className="relative shrink-0">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-2xl ${avatarColor.bg} ${avatarColor.text}`}>
                  {initials}
                </div>
                <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
              </div>

              {/* Name + pills */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-[#1F2937] leading-tight">
                  {student.first_name.toLowerCase()} {student.last_name.toLowerCase()}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">

                  {/* Code pill — click to copy */}
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-sm font-mono font-medium text-gray-700 hover:bg-gray-100 transition-colors group"
                  >
                    <Hash className="w-3.5 h-3.5 text-gray-400" />
                    {student.student_code ?? '—'}
                    {copied
                      ? <Check className="w-3.5 h-3.5 text-green-500 ml-0.5" />
                      : <Copy className="w-3 h-3 text-gray-300 group-hover:text-gray-500 ml-0.5 transition-colors" />
                    }
                  </button>

                  {/* Phone pill — icon + number */}
                  {student.phone ? (
                    <a
                      href={`tel:${student.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {student.phone}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-400">
                      <Phone className="w-3.5 h-3.5" />
                      Kiritilmagan
                    </span>
                  )}

                  {/* Group pill */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700">
                    <Layers className="w-3.5 h-3.5 text-gray-400" />
                    {primaryGroup?.name ?? 'N/A'}
                  </span>
                </div>
              </div>

              {/* Action buttons — Edit + Archive only */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom row */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              {payStatus && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${payStatus.color}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {payStatus.label}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide text-blue-600 bg-blue-50 border border-blue-200">
                DAVOMAT: {attendancePercent !== null ? `${attendancePercent}%` : '—'}
              </span>
              <button
                type="button"
                onClick={() => navigate('/messages')}
                className="ml-auto inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold transition-all shadow-[0_2px_12px_rgba(37,99,235,0.35)]"
              >
                <MessageCircle className="w-4 h-4" />
                Xabar yuborish
              </button>
            </div>
          </div>

          {/* ── Stats 2×2 ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-0.5">Balans</p>
                <p className="text-base font-bold text-[#1F2937]">{formatCurrency(student.balance ?? 0)}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-0.5">Oxirgi to'lov</p>
                {paymentsLoading ? (
                  <div className="h-4 w-20 bg-gray-100 animate-pulse rounded" />
                ) : lastPayment ? (
                  <p className="text-base font-bold text-[#1F2937]">{formatDate(lastPayment.created_at ?? '')}</p>
                ) : (
                  <>
                    <p className="text-base font-bold text-gray-400">—</p>
                    <p className="text-xs text-gray-400">To'lov yo'q</p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-0.5">Davomat (oylik)</p>
                {attendanceLoading ? (
                  <div className="h-4 w-16 bg-gray-100 animate-pulse rounded" />
                ) : attendancePercent !== null ? (
                  <p className="text-base font-bold text-[#1F2937]">{attendancePercent}%</p>
                ) : (
                  <>
                    <p className="text-base font-bold text-gray-400">—</p>
                    <p className="text-xs text-gray-400">Ma'lumot yo'q</p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-0.5">Guruh</p>
                <p className="text-base font-bold text-[#1F2937] truncate max-w-[120px]">{primaryGroup?.name ?? 'N/A'}</p>
                <p className="text-xs text-gray-400">Faol</p>
              </div>
            </div>
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-4">
            {(
              [
                ['overview',   'Umumiy'],
                ['payments',   "To'lovlar"],
                ['attendance', 'Davomat'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
                  tab === key
                    ? 'bg-white shadow-[0_1px_6px_rgba(0,0,0,0.08)] text-[#1F2937] font-semibold'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Tab: Umumiy ─────────────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {/* To'lov holati */}
              <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-widest bg-gray-100 rounded-full px-2 py-0.5">
                    JORIY OY
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">To'lov holati</p>
                  <p className={`text-lg font-bold ${payFull.color}`}>{payFull.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Balans: {formatCurrency(student.balance ?? 0)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentOpen(true)}
                  className="mt-auto flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] active:scale-95 text-white text-sm font-semibold transition-all shadow-[0_2px_10px_rgba(14,165,233,0.35)]"
                >
                  <Wallet className="w-4 h-4" />
                  To'lov qo'shish
                </button>
              </div>

              {/* Davomat */}
              <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-widest bg-gray-100 rounded-full px-2 py-0.5">
                    30 KUN
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Davomat</p>
                  {attendanceLoading ? (
                    <div className="h-8 w-24 bg-gray-100 animate-pulse rounded" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-[#1F2937]">
                        {attendancePercent !== null ? `${attendancePercent}%` : '—'}
                        <span className="text-sm font-medium text-gray-500 ml-1">qatnashish</span>
                      </p>
                      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${attendancePercent ?? 0}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-auto">Batafsil ma'lumot dars yozuvlarida</p>
              </div>

              {/* Qo'shimcha ma'lumot */}
              <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-gray-500" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Qo'shimcha ma'lumot</p>
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">Qo'shilgan sana</p>
                      <p className="text-sm font-bold text-[#1F2937] mt-0.5">
                        {student.created_at
                          ? new Date(student.created_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">Ota-ona raqami</p>
                      <p className="text-sm font-bold text-[#1F2937] mt-0.5">{student.parent_phone || 'Kiritilmagan'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: To'lovlar ──────────────────────────────────────────── */}
          {tab === 'payments' && (
            <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
              {paymentsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : paymentsError ? (
                <p className="py-10 text-center text-sm text-red-500">Ma'lumot yuklanmadi, qayta urinib ko'ring</p>
              ) : payments.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-400 mb-4">Hali to'lovlar yo'q</p>
                  <button
                    type="button"
                    onClick={() => setPaymentOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-sm font-semibold transition-all shadow-[0_2px_10px_rgba(14,165,233,0.35)]"
                  >
                    <Wallet className="w-4 h-4" />
                    To'lov qo'shish
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <span className="text-xs text-gray-500">Jami: {payments.length} ta to'lov</span>
                    <span className="text-sm font-semibold text-[#1F2937]">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {sortedPayments.map((p) => (
                      <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 hover:bg-gray-50/70 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-[#1F2937]">{formatCurrency(p.amount)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(p.created_at ?? '')} · {METHOD_LABEL[p.payment_method] ?? p.payment_method}
                            {p.month_year ? ` · ${p.month_year}` : ''}
                          </p>
                        </div>
                        <Badge
                          variant={p.status === 'paid' || p.status === 'prepaid' ? 'success' : p.status === 'partial' ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          {p.status === 'paid' || p.status === 'prepaid' ? "To'lagan" : p.status === 'partial' ? 'Qisman' : p.status === 'promised' ? "Va'da" : "Noma'lum"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Tab: Davomat ────────────────────────────────────────────── */}
          {tab === 'attendance' && (
            <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4">
              {attendanceLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : attendanceError ? (
                <p className="py-6 text-center text-sm text-red-500">Ma'lumot yuklanmadi, qayta urinib ko'ring</p>
              ) : allAttendance.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">Hali davomat ma'lumotlari yo'q</p>
              ) : (
                <>
                  {attendancePercent !== null && (
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Umumiy davomat ({totalAttendance} ta dars)</span>
                      <span className="text-sm font-bold text-[#1F2937]">{attendancePercent}% ({presentCount} ta keldi)</span>
                    </div>
                  )}
                  <AttendanceCalendar
                    allAttendance={allAttendance}
                    month={attendanceMonth}
                    onPrev={() => setAttendanceMonth(new Date(attendanceMonth.getFullYear(), attendanceMonth.getMonth() - 1))}
                    onNext={() => setAttendanceMonth(new Date(attendanceMonth.getFullYear(), attendanceMonth.getMonth() + 1))}
                  />
                </>
              )}
            </div>
          )}

        </div>
      </main>

      <EditStudentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        studentId={student.id}
        initial={{
          first_name:   student.first_name,
          last_name:    student.last_name,
          phone:        student.phone ?? '',
          parent_phone: student.parent_phone ?? '',
        }}
      />

      <ArchiveConfirmModal
        open={archiveOpen}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveOpen(false)}
        loading={archive.isPending}
      />

      <PaymentFormModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSubmit={(payload, isCreate) => {
          if (isCreate) {
            createPayment.mutate(
              { ...(payload as Parameters<typeof createPayment.mutate>[0]), student_id: student.id },
              { onSuccess: () => setPaymentOpen(false) }
            );
          }
        }}
        loading={createPayment.isPending}
      />
    </div>
  );
}
