import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, Check, CheckCircle2, AlertTriangle, Zap,
  Banknote, ArrowLeftRight, Smartphone, Building2, MoreHorizontal,
  Calendar,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { useStudents } from '../../hooks/useStudents';
import { useGroups } from '../../hooks/useGroups';
import { DEMO_GROUP_STUDENT_IDS } from '../../data/demoGroups';
import { formatCurrency } from '../../utils/formatCurrency';
import type {
  Payment, PaymentCreatePayload, PaymentUpdatePayload,
  PaymentMethod, PaymentStatus,
} from '../../types';

export interface PaymentFormModalProps {
  open: boolean;
  onClose: () => void;
  initial?: Payment | null;
  onSubmit: (payload: PaymentCreatePayload | PaymentUpdatePayload, isCreate: boolean) => void;
  onSubmitMultiple?: (payloads: PaymentCreatePayload[]) => void;
  loading?: boolean;
}

type PeriodType = 'current' | 'previous' | 'multi';
type OverpaymentAction = 'prepaid' | 'debt' | 'edit';

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; icon: React.ReactNode }> = [
  { value: 'cash',     label: 'Naqt',     icon: <Banknote className="w-3.5 h-3.5" /> },
  { value: 'transfer', label: "O'tkazma", icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  { value: 'click',    label: 'Click',    icon: <Smartphone className="w-3.5 h-3.5" /> },
  { value: 'payme',    label: 'Payme',    icon: <Building2 className="w-3.5 h-3.5" /> },
  { value: 'other',    label: 'Boshqa',   icon: <MoreHorizontal className="w-3.5 h-3.5" /> },
];

function getMonthYear(offset = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthYear: string): string {
  const [year, month] = monthYear.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function getShortMonthLabel(monthYear: string): string {
  const [year, month] = monthYear.split('-').map(Number);
  return `${MONTH_NAMES[month - 1].slice(0, 3)} ${year}`;
}

function getRecentMonths(count = 12): string[] {
  return Array.from({ length: count }, (_, i) => getMonthYear(-i));
}

function autoComputeStatus(paid: number, required: number): PaymentStatus {
  if (!required || paid <= 0) return 'paid';
  if (paid < required) return 'partial';
  if (paid > required) return 'prepaid';
  return 'paid';
}

// ─── Overpayment modal ────────────────────────────────────────────────────────

interface OverpaymentModalProps {
  open: boolean;
  studentName: string;
  overpaid: number;
  selected: OverpaymentAction;
  onSelect: (a: OverpaymentAction) => void;
  onConfirm: () => void;
  onBack: () => void;
}

function OverpaymentModal({ open, studentName, overpaid, selected, onSelect, onConfirm, onBack }: OverpaymentModalProps) {
  if (!open) return null;

  const options: Array<{ value: OverpaymentAction; emoji: string; title: string; desc: string }> = [
    {
      value: 'prepaid',
      emoji: '📅',
      title: "Keyingi oyga o'tqizish",
      desc: 'Ortiqcha summa keyingi oyning to\'loviga hisoblanadi (prepaid)',
    },
    {
      value: 'debt',
      emoji: '✅',
      title: 'Qarzdorligini yopish',
      desc: "Agar qarzi bo'lmasa avtomatik ravishda prepaid sifatida saqlanadi",
    },
    {
      value: 'edit',
      emoji: '✏️',
      title: 'Qayta kiritish',
      desc: "To'lov miqdorini o'zgartirish uchun orqaga qaytish",
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onBack}
      />

      {/* Card */}
      <div
        className="relative bg-white rounded-[28px] w-full max-w-sm overflow-hidden"
        style={{
          boxShadow:
            '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.10), 0 32px 64px rgba(0,0,0,0.12)',
          animation: 'modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
          </div>
          <h3 className="text-[17px] font-bold text-[#1c1c1e] mb-1.5">Ortiqcha to'lov</h3>
          <p className="text-[13px] text-[#6c6c70] leading-relaxed">
            <span className="font-semibold text-[#1c1c1e]">{studentName}</span> o'quvchingiz{' '}
            <span className="font-semibold text-[#007AFF]">{formatCurrency(overpaid)}</span>{' '}
            ortiqcha to'lamoqda. Ortiqcha summani nima qilamiz?
          </p>
        </div>

        {/* Options */}
        <div className="px-4 space-y-2 pb-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all duration-200"
              style={{
                background: selected === opt.value ? 'rgba(0,122,255,0.08)' : '#F5F5F7',
                border: selected === opt.value ? '2px solid rgba(0,122,255,0.3)' : '2px solid transparent',
              }}
            >
              <span className="text-xl shrink-0">{opt.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1c1c1e]">{opt.title}</p>
                <p className="text-[11px] text-[#8e8e93] mt-0.5 leading-relaxed">{opt.desc}</p>
              </div>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
                style={{
                  background: selected === opt.value ? '#007AFF' : 'transparent',
                  border: selected === opt.value ? 'none' : '2px solid #d1d1d6',
                }}
              >
                {selected === opt.value && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="p-4 pt-2 flex gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-3.5 rounded-2xl bg-[#F5F5F7] text-[#1c1c1e] font-semibold text-[14px] hover:bg-[#ebebef] transition-colors"
          >
            Orqaga
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-[2] py-3.5 rounded-2xl text-white font-semibold text-[14px] transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            }}
          >
            Tasdiqlash
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function PaymentFormModal({
  open,
  onClose,
  initial,
  onSubmit,
  onSubmitMultiple,
  loading = false,
}: PaymentFormModalProps) {
  const { data: students = [] } = useStudents();
  const { data: groups = [] } = useGroups();

  const [studentSearch, setStudentSearch] = useState('');
  const [studentId, setStudentId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [periodType, setPeriodType] = useState<PeriodType>('current');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([getMonthYear(0)]);
  const [note, setNote] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showOverpayment, setShowOverpayment] = useState(false);
  const [overpaymentAction, setOverpaymentAction] = useState<OverpaymentAction>('prepaid');
  const [pendingPayload, setPendingPayload] = useState<PaymentCreatePayload | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isEdit = !!initial?.id;
  const activeStudents = students.filter((s) => !s.is_archived);
  const activeGroups = groups.filter((g) => !g.is_archived);

  // ── Derived state ──────────────────────────────────────────────────────────

  const selectedStudent = useMemo(
    () => activeStudents.find((s) => s.id === studentId) ?? null,
    [studentId, activeStudents]
  );

  const studentGroups = useMemo(() => {
    if (!studentId) return [];
    if (selectedStudent?.groups && selectedStudent.groups.length > 0) {
      return selectedStudent.groups.filter((g) => !g.is_archived);
    }
    if (studentId.startsWith('demo-')) {
      return activeGroups.filter((g) => DEMO_GROUP_STUDENT_IDS[g.id]?.includes(studentId));
    }
    return activeGroups;
  }, [studentId, selectedStudent, activeGroups]);

  const selectedGroup = useMemo(
    () => activeGroups.find((g) => g.id === groupId) ?? null,
    [groupId, activeGroups]
  );

  const requiredAmount = selectedGroup?.monthly_fee ?? 0;
  const paidAmount = parseFloat(amount) || 0;

  const breakdown = useMemo(() => {
    if (!requiredAmount || paidAmount <= 0) return null;
    const diff = paidAmount - requiredAmount;
    const paidPct = (paidAmount / requiredAmount) * 100;
    if (diff < 0) {
      return {
        type: 'partial' as const,
        paidPct: Math.min(paidPct, 100),
        remaining: Math.abs(diff),
        remainingPct: (Math.abs(diff) / requiredAmount) * 100,
      };
    }
    if (diff === 0) return { type: 'full' as const, paidPct: 100 };
    return {
      type: 'over' as const,
      paidPct: 100,
      overpaid: diff,
      overpaidPct: (diff / requiredAmount) * 100,
    };
  }, [paidAmount, requiredAmount]);

  const autoStatus = useMemo(
    () => autoComputeStatus(paidAmount, requiredAmount),
    [paidAmount, requiredAmount]
  );

  const monthYears = useMemo(() => {
    if (periodType === 'current') return [getMonthYear(0)];
    if (periodType === 'previous') return [getMonthYear(-1)];
    return selectedMonths.length > 0 ? selectedMonths : [getMonthYear(0)];
  }, [periodType, selectedMonths]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();
    if (!q) return activeStudents.slice(0, 7);
    return activeStudents
      .filter(
        (s) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          (s.student_code ?? '').toLowerCase().includes(q)
      )
      .slice(0, 7);
  }, [studentSearch, activeStudents]);

  const canSubmit = !!(studentId && groupId && paidAmount > 0 && monthYears.length > 0);

  const studentName = selectedStudent
    ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
    : '';

  // ── Auto-select group ──────────────────────────────────────────────────────

  useEffect(() => {
    if (studentGroups.length === 1) setGroupId(studentGroups[0].id);
    else if (studentGroups.length === 0 && studentId) setGroupId('');
  }, [studentGroups, studentId]);

  // ── Reset on open ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setStudentId(initial.student_id ?? '');
      setGroupId(initial.group_id ?? '');
      setAmount(String(initial.amount ?? ''));
      setPaymentMethod(initial.payment_method ?? 'cash');
      setNote(initial.note ?? '');
      const my = initial.month_year ?? getMonthYear(0);
      setSelectedMonths([my]);
      setPeriodType('current');
    } else {
      setStudentId('');
      setGroupId('');
      setAmount('');
      setPaymentMethod('cash');
      setNote('');
      setSelectedMonths([getMonthYear(0)]);
      setPeriodType('current');
    }
    setStudentSearch('');
    setShowDropdown(false);
    setShowOverpayment(false);
    setOverpaymentAction('prepaid');
    setPendingPayload(null);
  }, [open, initial]);

  // ── Close dropdown on outside click ──────────────────────────────────────

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

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectStudent = (id: string) => {
    setStudentId(id);
    setGroupId('');
    setStudentSearch('');
    setShowDropdown(false);
  };

  const clearStudent = () => {
    setStudentId('');
    setGroupId('');
    setAmount('');
    setStudentSearch('');
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const toggleMonth = (m: string) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const buildPayloads = (statusOverride?: PaymentStatus): PaymentCreatePayload[] => {
    const base: Omit<PaymentCreatePayload, 'month_year'> = {
      student_id: studentId,
      group_id: groupId,
      amount: paidAmount,
      payment_method: paymentMethod,
      status: statusOverride ?? autoStatus,
      note: note.trim() || null,
    };
    return monthYears.map((my) => ({ ...base, month_year: my }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (isEdit) {
      onSubmit(
        {
          amount: paidAmount,
          payment_method: paymentMethod,
          status: autoStatus,
          note: note.trim() || null,
        } as PaymentUpdatePayload,
        false
      );
      return;
    }

    if (breakdown?.type === 'over') {
      const [first] = buildPayloads('prepaid');
      setPendingPayload(first);
      setShowOverpayment(true);
      return;
    }

    submitPayloads(buildPayloads());
  };

  const submitPayloads = (payloads: PaymentCreatePayload[]) => {
    if (payloads.length === 1) {
      onSubmit(payloads[0], true);
    } else if (onSubmitMultiple) {
      onSubmitMultiple(payloads);
    } else {
      onSubmit(payloads[0], true);
    }
  };

  const handleOverpaymentConfirm = () => {
    if (!pendingPayload) return;
    if (overpaymentAction === 'edit') {
      setShowOverpayment(false);
      return;
    }
    const finalStatus: PaymentStatus = overpaymentAction === 'prepaid' ? 'prepaid' : 'paid';
    submitPayloads(buildPayloads(finalStatus));
    setShowOverpayment(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const statusInfo = {
    paid: { color: '#34C759', label: "To'liq to'landi" },
    partial: { color: '#FF9500', label: "Qisman to'landi" },
    prepaid: { color: '#007AFF', label: 'Ortiqcha (prepaid)' },
    promised: { color: '#8E8E93', label: 'Vada qilindi' },
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={isEdit ? "To'lovni tahrirlash" : "To'lov qo'shish"}
      >
        <form onSubmit={handleSubmit} className="space-y-5 pb-1">

          {/* ── Student ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">
              O'quvchi
            </p>

            {isEdit ? (
              /* Edit mode: show student as pill */
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F5F5F7]">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #5e5ce6, #007AFF)' }}
                >
                  {selectedStudent?.first_name?.[0]}{selectedStudent?.last_name?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">{studentName}</p>
                  {selectedGroup && (
                    <p className="text-[12px] text-[#8e8e93] truncate">{selectedGroup.name}</p>
                  )}
                </div>
              </div>
            ) : !studentId ? (
              /* Search input */
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e93]" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Ism, familiya yoki kod bilan qidiring..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-[13px] text-[#1c1c1e] placeholder-[#c7c7cc] outline-none transition-all duration-200"
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
                        onClick={() => handleSelectStudent(st.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F5F5F7] transition-colors text-left"
                        style={{
                          borderTop: idx > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: `hsl(${(st.id.charCodeAt(5) * 47) % 360},60%,55%)` }}
                        >
                          {st.first_name[0]}{st.last_name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#1c1c1e]">
                            {st.first_name} {st.last_name}
                          </p>
                          <p className="text-[11px] text-[#8e8e93]">#{st.student_code}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Selected student card */
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,122,255,0.06), rgba(94,92,230,0.06))',
                  border: '1.5px solid rgba(0,122,255,0.15)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #5e5ce6, #007AFF)' }}
                >
                  {selectedStudent?.first_name?.[0]}{selectedStudent?.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">{studentName}</p>
                  {selectedGroup ? (
                    <p className="text-[12px] text-[#007AFF] truncate">
                      📚 {selectedGroup.name} · {formatCurrency(requiredAmount)}
                    </p>
                  ) : studentGroups.length > 1 ? (
                    <p className="text-[12px] text-[#FF9500]">⬇ Guruhni tanlang</p>
                  ) : (
                    <p className="text-[12px] text-[#8e8e93]">Guruh topilmadi</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearStudent}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0"
                  style={{ background: 'rgba(0,0,0,0.08)' }}
                >
                  <X className="w-3 h-3 text-[#3c3c43]" />
                </button>
              </div>
            )}
          </div>

          {/* ── Group selector (multiple groups) ──────────────────────── */}
          {!isEdit && studentId && studentGroups.length > 1 && (
            <div>
              <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">
                Guruh
              </p>
              <div className="flex flex-wrap gap-2">
                {studentGroups.map((gr) => (
                  <button
                    key={gr.id}
                    type="button"
                    onClick={() => setGroupId(gr.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-200"
                    style={{
                      background: groupId === gr.id ? '#1c1c1e' : '#F5F5F7',
                      color: groupId === gr.id ? '#fff' : '#3c3c43',
                      boxShadow: groupId === gr.id ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                    }}
                  >
                    {groupId === gr.id && <Check className="w-3 h-3" />}
                    {gr.name}
                    <span style={{ opacity: 0.6, fontSize: '11px' }}>
                      {formatCurrency(gr.monthly_fee)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Amount ──────────────────────────────────────────────────── */}
          {(isEdit || (studentId && groupId)) && (
            <div>
              <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">
                To'lov miqdori
                {requiredAmount > 0 && (
                  <span className="ml-1 normal-case font-normal text-[#8e8e93]">
                    · kerakli: {formatCurrency(requiredAmount)}
                  </span>
                )}
              </p>

              {/* Amount input */}
              <div
                className="relative flex items-center rounded-2xl overflow-hidden transition-all duration-200"
                style={{ background: '#F5F5F7' }}
              >
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 bg-transparent px-5 py-4 text-[28px] font-bold text-[#1c1c1e] placeholder-[#c7c7cc] outline-none tabular-nums text-right"
                  style={{ minWidth: 0 }}
                  autoFocus={!isEdit}
                />
                <span className="pr-5 text-[16px] font-medium text-[#8e8e93] shrink-0">so'm</span>
              </div>

              {/* Breakdown indicator */}
              {requiredAmount > 0 && paidAmount > 0 && breakdown && (
                <div className="mt-3 space-y-2">
                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#e5e5ea' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(breakdown.paidPct, 100)}%`,
                          background:
                            breakdown.type === 'full'
                              ? '#34C759'
                              : breakdown.type === 'over'
                              ? '#007AFF'
                              : '#FF9500',
                        }}
                      />
                    </div>
                    <span
                      className="text-[12px] font-semibold shrink-0"
                      style={{
                        color:
                          breakdown.type === 'full'
                            ? '#34C759'
                            : breakdown.type === 'over'
                            ? '#007AFF'
                            : '#FF9500',
                      }}
                    >
                      {breakdown.type === 'partial'
                        ? `${breakdown.paidPct.toFixed(1)}%`
                        : breakdown.type === 'full'
                        ? '100%'
                        : `+${breakdown.overpaidPct.toFixed(1)}%`}
                    </span>
                  </div>

                  {/* Info pill */}
                  {breakdown.type === 'partial' && (
                    <div
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl"
                      style={{ background: 'rgba(255,149,0,0.10)', border: '1px solid rgba(255,149,0,0.20)' }}
                    >
                      <AlertTriangle className="w-4 h-4 text-[#FF9500] shrink-0" />
                      <p className="text-[12px] text-[#c57200] leading-snug">
                        <span className="font-semibold">{breakdown.paidPct.toFixed(1)}%</span> to'landi ·{' '}
                        <span className="font-semibold">{breakdown.remainingPct.toFixed(1)}%</span> qoldi{' '}
                        <span className="opacity-70">({formatCurrency(breakdown.remaining)})</span>
                      </p>
                    </div>
                  )}
                  {breakdown.type === 'full' && (
                    <div
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl"
                      style={{ background: 'rgba(52,199,89,0.10)', border: '1px solid rgba(52,199,89,0.20)' }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0" />
                      <p className="text-[12px] text-[#1a7a34] font-medium">
                        To'lov to'liq amalga oshirildi
                      </p>
                    </div>
                  )}
                  {breakdown.type === 'over' && (
                    <div
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl"
                      style={{ background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.20)' }}
                    >
                      <Zap className="w-4 h-4 text-[#007AFF] shrink-0" />
                      <p className="text-[12px] text-[#0055b3] leading-snug">
                        <span className="font-semibold">{breakdown.overpaidPct.toFixed(1)}%</span> ortiqcha to'lanmoqda{' '}
                        <span className="opacity-70">({formatCurrency(breakdown.overpaid)})</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Payment method ───────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">
              To'lov usuli
            </p>
            <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
              {PAYMENT_METHODS.map((m) => {
                const active = paymentMethod === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium shrink-0 transition-all duration-200"
                    style={{
                      background: active ? '#1c1c1e' : '#F5F5F7',
                      color: active ? '#fff' : '#3c3c43',
                      boxShadow: active ? '0 4px 14px rgba(0,0,0,0.18)' : 'none',
                      transform: active ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Period ──────────────────────────────────────────────────── */}
          {!isEdit && (
            <div>
              <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">
                Qaysi oyga?
              </p>

              {/* Period type chips */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {([
                  { value: 'current' as PeriodType, label: 'Joriy oy' },
                  { value: 'previous' as PeriodType, label: "O'tgan oy" },
                  { value: 'multi' as PeriodType, label: 'Kop oylik' },
                ] as const).map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setPeriodType(p.value);
                      if (p.value === 'current') setSelectedMonths([getMonthYear(0)]);
                      if (p.value === 'previous') setSelectedMonths([getMonthYear(-1)]);
                    }}
                    className="py-2 px-2 rounded-xl text-[13px] font-medium transition-all duration-200 text-center"
                    style={{
                      background: periodType === p.value ? '#1c1c1e' : '#F5F5F7',
                      color: periodType === p.value ? '#fff' : '#3c3c43',
                      boxShadow: periodType === p.value ? '0 4px 12px rgba(0,0,0,0.18)' : 'none',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Current / previous month label */}
              {periodType !== 'multi' && (
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                  style={{ background: '#F5F5F7' }}
                >
                  <Calendar className="w-4 h-4 text-[#8e8e93]" />
                  <span className="text-[13px] font-medium text-[#1c1c1e]">
                    {getMonthLabel(monthYears[0])}
                  </span>
                </div>
              )}

              {/* Multi-month grid */}
              {periodType === 'multi' && (
                <div className="grid grid-cols-3 gap-1.5">
                  {getRecentMonths(12).map((month) => {
                    const picked = selectedMonths.includes(month);
                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => toggleMonth(month)}
                        className="py-2 px-2 rounded-xl text-[12px] font-medium text-center transition-all duration-200"
                        style={{
                          background: picked
                            ? 'rgba(0,122,255,0.12)'
                            : '#F5F5F7',
                          color: picked ? '#007AFF' : '#3c3c43',
                          border: picked ? '1.5px solid rgba(0,122,255,0.3)' : '1.5px solid transparent',
                          fontWeight: picked ? 700 : 500,
                        }}
                      >
                        {getShortMonthLabel(month)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Note ────────────────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">
              Izoh <span className="font-normal normal-case">(ixtiyoriy)</span>
            </p>
            <input
              type="text"
              placeholder="Qo'shimcha ma'lumot..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-[13px] text-[#1c1c1e] placeholder-[#c7c7cc] outline-none transition-all duration-200"
              style={{ background: '#F5F5F7' }}
            />
          </div>

          {/* ── Auto-status badge ─────────────────────────────────────── */}
          {canSubmit && (
            <div
              className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl"
              style={{
                background: `${statusInfo[autoStatus]?.color}14`,
                border: `1px solid ${statusInfo[autoStatus]?.color}35`,
              }}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: statusInfo[autoStatus]?.color }}
              />
              <span className="text-[13px] font-semibold" style={{ color: statusInfo[autoStatus]?.color }}>
                {statusInfo[autoStatus]?.label}
              </span>
              {requiredAmount > 0 && paidAmount > 0 && (
                <span className="text-[12px] text-[#8e8e93]">
                  · {formatCurrency(paidAmount)} / {formatCurrency(requiredAmount)}
                </span>
              )}
              {monthYears.length > 1 && (
                <span
                  className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(0,122,255,0.12)', color: '#007AFF' }}
                >
                  {monthYears.length} oy
                </span>
              )}
            </div>
          )}

          {/* ── Buttons ─────────────────────────────────────────────────── */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold transition-all duration-200"
              style={{ background: '#F5F5F7', color: '#3c3c43' }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="py-3.5 rounded-2xl text-white text-[14px] font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                flex: 2,
                background: canSubmit && !loading
                  ? 'linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)'
                  : '#c7c7cc',
                boxShadow: canSubmit && !loading ? '0 6px 20px rgba(0,0,0,0.22)' : 'none',
              }}
            >
              {loading
                ? 'Saqlanmoqda...'
                : isEdit
                ? 'Saqlash'
                : breakdown?.type === 'over'
                ? "⚡ Tasdiqlash"
                : "To'lovni tasdiqlash"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Overpayment confirmation */}
      <OverpaymentModal
        open={showOverpayment}
        studentName={studentName}
        overpaid={breakdown?.type === 'over' ? breakdown.overpaid : 0}
        selected={overpaymentAction}
        onSelect={setOverpaymentAction}
        onConfirm={handleOverpaymentConfirm}
        onBack={() => setShowOverpayment(false)}
      />
    </>
  );
}
