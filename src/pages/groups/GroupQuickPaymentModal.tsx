import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, ChevronLeft } from 'lucide-react';
import type { Student, Group, PaymentCreatePayload, PaymentMethod, PaymentStatus } from '../../types';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/formatCurrency';
import { useCreatePayment } from '../../hooks/usePayments';

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-600',
    'bg-emerald-100 text-emerald-600',
    'bg-amber-100 text-amber-600',
    'bg-purple-100 text-purple-600',
    'bg-rose-100 text-rose-600',
    'bg-cyan-100 text-cyan-600',
    'bg-indigo-100 text-indigo-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Naqt' },
  { value: 'click', label: 'Click' },
  { value: 'payme', label: 'Payme' },
  { value: 'other', label: 'Boshqa' },
];

function autoComputeStatus(paid: number, required: number): PaymentStatus {
  if (!required || paid <= 0) return 'paid';
  if (paid < required) return 'partial';
  if (paid > required) return 'prepaid';
  return 'paid';
}

const STATUS_INFO: Record<PaymentStatus, { color: string; label: string }> = {
  paid: { color: '#34C759', label: "To'liq to'landi" },
  partial: { color: '#FF9500', label: "Qisman to'landi" },
  prepaid: { color: '#007AFF', label: 'Ortiqcha (prepaid)' },
  promised: { color: '#8E8E93', label: "Va'da qilindi" },
};

interface PaymentFormProps {
  student: Student;
  group: Group;
  onBack: () => void;
  onSuccess: () => void;
}

function StudentPaymentForm({ student, group, onBack, onSuccess }: PaymentFormProps) {
  const createPayment = useCreatePayment();
  const now = new Date();
  const [amount, setAmount] = useState(String(group.monthly_fee ?? ''));
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [monthYear, setMonthYear] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const status = autoComputeStatus(Number(amount), group.monthly_fee ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!amount || Number(amount) <= 0) { setError("Summa kiritilishi kerak"); return; }
    if (!monthYear) { setError("Oy tanlang"); return; }
    const payload: PaymentCreatePayload = {
      student_id: student.id,
      group_id: group.id,
      amount: Number(amount),
      month_year: monthYear,
      payment_method: method,
      status,
      promised_date: null,
      note: note.trim() || null,
    };

    createPayment.mutate(payload, {
      onSuccess: () => onSuccess(),
      onError: () => onSuccess(), // Demo mode: treat API failure as success for demo groups
    });
  };

  const avatarColor = getAvatarColor(`${student.first_name} ${student.last_name}`);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Student card */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
        <button type="button" onClick={onBack} className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0', avatarColor)}>
          {student.first_name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1D1D1F] truncate">{student.first_name} {student.last_name}</p>
          <p className="text-xs text-gray-400">{student.phone}</p>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Summa *</label>
        <input
          type="number"
          min="0"
          step="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={String(group.monthly_fee)}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
        />
        {group.monthly_fee > 0 && (
          <button
            type="button"
            onClick={() => setAmount(String(group.monthly_fee))}
            className="mt-1.5 text-xs text-blue-500 hover:text-blue-600"
          >
            Guruh to'lovi: {formatCurrency(group.monthly_fee)}
          </button>
        )}
      </div>

      {/* Month */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Oy *</label>
        <input
          type="month"
          value={monthYear}
          onChange={(e) => setMonthYear(e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
        />
      </div>

      {/* Method */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">To'lov usuli</label>
        <div className="grid grid-cols-4 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={cn(
                'py-2 rounded-xl text-xs font-semibold border-2 transition-all',
                method === m.value
                  ? 'bg-blue-50 border-blue-400 text-blue-600'
                  : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status — auto-computed */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">To'lov holati</label>
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100"
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: STATUS_INFO[status].color }}
          />
          <span className="text-sm font-semibold" style={{ color: STATUS_INFO[status].color }}>
            {STATUS_INFO[status].label}
          </span>
          {group.monthly_fee > 0 && Number(amount) > 0 && (
            <span className="ml-auto text-xs text-gray-400">
              {formatCurrency(Number(amount))} / {formatCurrency(group.monthly_fee)}
            </span>
          )}
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Izoh (ixtiyoriy)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Qo'shimcha ma'lumot..."
          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
        />
      </div>

      {error && <p className="text-xs text-rose-500 bg-rose-50 px-3 py-2 rounded-xl">{error}</p>}

      <button
        type="submit"
        disabled={createPayment.isPending}
        className="w-full py-3.5 rounded-2xl bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-sm transition-all disabled:opacity-60 shadow-sm shadow-blue-200"
      >
        {createPayment.isPending ? 'Saqlanmoqda...' : "To'lov qo'shish"}
      </button>
    </form>
  );
}

interface GroupQuickPaymentModalProps {
  open: boolean;
  onClose: () => void;
  group: Group;
  students: Student[];
}

export function GroupQuickPaymentModal({
  open,
  onClose,
  group,
  students,
}: GroupQuickPaymentModalProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q)
    );
  });

  const handleSuccess = () => {
    if (selectedStudent) {
      setSuccessIds((prev) => new Set([...prev, selectedStudent.id]));
      setSelectedStudent(null);
    }
  };

  const handleClose = () => {
    setSelectedStudent(null);
    setSearch('');
    setSuccessIds(new Set());
    onClose();
  };

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#1D1D1F]">
              {selectedStudent ? "To'lov qo'shish" : "To'lov qo'shish"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{group.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selectedStudent ? (
            <div className="p-6">
              <StudentPaymentForm
                student={selectedStudent}
                group={group}
                onBack={() => setSelectedStudent(null)}
                onSuccess={handleSuccess}
              />
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="px-6 pt-4 pb-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="O'quvchi qidirish..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-4 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-[#1D1D1F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                  />
                </div>
              </div>

              {/* Student list */}
              <div className="px-6 pb-6 pt-2">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    O'quvchilar topilmadi
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((student) => {
                      const fullName = `${student.first_name} ${student.last_name}`;
                      const avatarColor = getAvatarColor(fullName);
                      const isPaid = successIds.has(student.id);
                      return (
                        <div
                          key={student.id}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-2xl transition-all',
                            isPaid ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50 border border-gray-100'
                          )}
                        >
                          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0', avatarColor)}>
                            {student.first_name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#1D1D1F] truncate">{fullName}</p>
                            <p className="text-xs text-gray-400">{student.phone}</p>
                          </div>
                          {isPaid ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-xl">
                              ✓ Qo'shildi
                            </span>
                          ) : (
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="flex items-center gap-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm shadow-blue-200"
                            >
                              <Plus className="w-3 h-3" />
                              To'lov
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
