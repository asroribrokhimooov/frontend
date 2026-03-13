import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Pencil, TrendingUp, TrendingDown, Wallet,
  AlertCircle, ChevronLeft, ChevronRight, FileDown,
  Banknote, Smartphone, Building2, MoreHorizontal,
  X, Clock, Calendar, Hash, Users,
} from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { PaymentFormModal } from './PaymentFormModal';
import {
  usePayments,
  useDebtors,
  usePaymentReports,
  useCreatePayment,
  useUpdatePayment,
} from '../../hooks/usePayments';
import { formatCurrency } from '../../utils/formatCurrency';
import type { Payment, PaymentCreatePayload, PaymentUpdatePayload } from '../../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { writeFile, utils } from 'xlsx';

type TabType = 'history' | 'debtors' | 'reports';
type FilterType = 'today' | 'week' | 'month';

const METHOD_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  cash:     { label: 'Naqt',     icon: <Banknote className="w-3.5 h-3.5" />,     color: '#34C759', bg: 'rgba(52,199,89,0.1)' },
  click:    { label: 'Click',    icon: <Smartphone className="w-3.5 h-3.5" />,   color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
  payme:    { label: 'Payme',    icon: <Building2 className="w-3.5 h-3.5" />,    color: '#007AFF', bg: 'rgba(0,122,255,0.1)' },
  other:    { label: 'Boshqa',   icon: <MoreHorizontal className="w-3.5 h-3.5" />, color: '#8E8E93', bg: 'rgba(142,142,147,0.1)' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  paid:     { label: "To'liq",   color: '#34C759', bg: 'rgba(52,199,89,0.12)' },
  partial:  { label: 'Qisman',   color: '#FF9500', bg: 'rgba(255,149,0,0.12)' },
  promised: { label: 'Vada',     color: '#8E8E93', bg: 'rgba(142,142,147,0.12)' },
  prepaid:  { label: 'Prepaid',  color: '#007AFF', bg: 'rgba(0,122,255,0.12)' },
};

const PIE_COLORS = ['#007AFF', '#34C759', '#FF9500', '#8B5CF6', '#5AC8FA', '#FF3B30'];

function getMonthYear(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

function formatMonthLabel(monthYear: string): string {
  const [year, month] = monthYear.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const meta = METHOD_META[method] ?? METHOD_META.other;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold"
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.paid;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold"
      style={{ color: meta.color, background: meta.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PaymentsPage() {
  const [tab, setTab] = useState<TabType>('history');
  const [filter, setFilter] = useState<FilterType>('month');
  const [formOpen, setFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
  const [currentMonth, setCurrentMonth] = useState(getMonthYear);

  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: debtors = [], isLoading: debtorsLoading } = useDebtors();
  const { data: reports, isLoading: reportsLoading } = usePaymentReports(currentMonth);

  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment(editingPayment?.id);

  const filteredPayments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let list = payments;

    if (filter === 'today') {
      list = list.filter((p) => {
        const d = new Date(p.created_at || 0);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() === today.getTime();
      });
    } else if (filter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      list = list.filter((p) => new Date(p.created_at || 0) >= weekAgo);
    } else {
      const [y, m] = currentMonth.split('-').map(Number);
      list = list.filter((p) => {
        const d = new Date(p.created_at || 0);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      });
    }

    return list.sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [payments, filter, currentMonth]);

  const handleSubmitForm = (
    payload: PaymentCreatePayload | PaymentUpdatePayload,
    isCreate: boolean
  ) => {
    if (isCreate) {
      createPayment.mutate(payload as PaymentCreatePayload, {
        onSuccess: () => { setFormOpen(false); setEditingPayment(null); },
      });
    } else {
      updatePayment.mutate(payload as PaymentUpdatePayload, {
        onSuccess: () => { setFormOpen(false); setEditingPayment(null); },
      });
    }
  };

  const handleSubmitMultiple = (payloads: PaymentCreatePayload[]) => {
    payloads.forEach((p) => createPayment.mutate(p));
    setFormOpen(false);
    setEditingPayment(null);
  };

  const openCreate = () => { setEditingPayment(null); setFormOpen(true); };
  const openEdit = (p: Payment) => { setDetailPayment(null); setEditingPayment(p); setFormOpen(true); };

  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const newM = m === 1 ? 12 : m - 1;
    const newY = m === 1 ? y - 1 : y;
    setCurrentMonth(`${newY}-${String(newM).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const newM = m === 12 ? 1 : m + 1;
    const newY = m === 12 ? y + 1 : y;
    setCurrentMonth(`${newY}-${String(newM).padStart(2, '0')}`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(16);
    doc.text("TeachFlow — To'lovlar hisoboti", pageW / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 15, 25);
    autoTable(doc, {
      head: [["O'quvchi", 'Guruh', 'Summa', 'Usul', 'Status', 'Sana']],
      body: filteredPayments.map((p) => [
        `${p.student?.first_name ?? ''} ${p.student?.last_name ?? ''}`,
        p.group?.name ?? '',
        formatCurrency(p.amount),
        METHOD_META[p.payment_method]?.label ?? p.payment_method,
        STATUS_META[p.status]?.label ?? p.status,
        new Date(p.created_at || '').toLocaleDateString('uz-UZ'),
      ]),
      startY: 35,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9 },
    });
    doc.save(`to'lovlar-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportExcel = () => {
    const data = filteredPayments.map((p) => ({
      "O'quvchi": `${p.student?.first_name ?? ''} ${p.student?.last_name ?? ''}`,
      Guruh: p.group?.name ?? '',
      Summa: p.amount,
      Usul: METHOD_META[p.payment_method]?.label ?? p.payment_method,
      Status: STATUS_META[p.status]?.label ?? p.status,
      Sana: new Date(p.created_at || '').toLocaleDateString('uz-UZ'),
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "To'lovlar");
    writeFile(wb, `to'lovlar-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const isLoading = createPayment.isPending || updatePayment.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Sidebar />
      <main className="md:pl-[280px] pb-24 md:pb-8">
        <Header />

        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

          {/* ── Page header ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-bold text-[#1c1c1e] tracking-tight">
                To'lovlar
              </h1>
              <p className="text-[13px] text-[#8e8e93] mt-0.5">
                {new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' })}
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-white text-[14px] font-semibold transition-all duration-200 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #0077B6 0%, #0096C7 100%)',
                boxShadow: '0 4px 16px rgba(0,119,182,0.35)',
              }}
            >
              <Plus className="w-4 h-4" />
              To'lov qo'shish
            </button>
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────── */}
          <div
            className="flex p-1 rounded-2xl gap-1"
            style={{ background: '#e5e5ea' }}
          >
            {([
              { key: 'history' as TabType, label: 'Tarix' },
              { key: 'debtors' as TabType, label: 'Qarzdorlar' },
              { key: 'reports' as TabType, label: 'Hisobot' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200"
                style={{
                  background: tab === key ? '#fff' : 'transparent',
                  color: tab === key ? '#1c1c1e' : '#8e8e93',
                  boxShadow: tab === key
                    ? '0 1px 3px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.05)'
                    : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB: History                                                   */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {tab === 'history' && (
            <div className="space-y-4">
              {/* Filter chips */}
              <div className="flex gap-2">
                {([
                  { key: 'today' as FilterType, label: 'Bugun' },
                  { key: 'week' as FilterType, label: 'Hafta' },
                  { key: 'month' as FilterType, label: 'Oy' },
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

              {paymentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredPayments.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                  <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-4">
                    <TrendingUp className="w-8 h-8 text-[#c7c7cc]" />
                  </div>
                  <p className="text-[15px] font-semibold text-[#1c1c1e]">To'lovlar yo'q</p>
                  <p className="text-[13px] text-[#8e8e93] mt-1 mb-4">Yangi to'lov qo'shish uchun tugmani bosing</p>
                  <button
                    onClick={openCreate}
                    className="px-5 py-2.5 rounded-2xl text-white text-[13px] font-semibold"
                    style={{ background: '#0077B6', boxShadow: '0 4px 14px rgba(0,119,182,0.35)' }}
                  >
                    To'lov qo'shish
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredPayments.map((payment) => (
                    <PaymentCard
                      key={payment.id}
                      payment={payment}
                      onClick={() => setDetailPayment(payment)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB: Debtors                                                   */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {tab === 'debtors' && (
            <div className="space-y-2.5">
              {debtorsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : debtors.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                    <TrendingUp className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-[15px] font-semibold text-[#1c1c1e]">Qarzdorlar yo'q</p>
                  <p className="text-[13px] text-[#8e8e93] mt-1">Barcha to'lovlar amalga oshirilgan</p>
                </div>
              ) : (
                <>
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.15)' }}
                  >
                    <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0" />
                    <p className="text-[13px] text-[#c0392b] font-medium">
                      Jami {debtors.length} nafar o'quvchida qarzdorlik mavjud
                    </p>
                  </div>
                  {debtors.map((debtor) => (
                    <div
                      key={debtor.student_id}
                      className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl"
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{
                          background: `hsl(${(debtor.student_id.charCodeAt(5) * 47) % 360},55%,55%)`,
                        }}
                      >
                        {debtor.student?.first_name?.[0]}{debtor.student?.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">
                          {debtor.student?.first_name} {debtor.student?.last_name}
                        </p>
                        <p className="text-[12px] text-[#8e8e93] truncate">{debtor.group?.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[14px] font-bold text-[#FF3B30]">
                          -{formatCurrency(debtor.total_debt)}
                        </p>
                        <button
                          onClick={openCreate}
                          className="mt-1 text-[11px] font-semibold text-[#007AFF] hover:opacity-70 transition-opacity"
                        >
                          To'lovni kiritish →
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB: Reports                                                   */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {tab === 'reports' && (
            <div className="space-y-4">
              {/* Month navigator */}
              <div
                className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
              >
                <button
                  onClick={handlePrevMonth}
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-[#8e8e93]" />
                </button>
                <span className="text-[15px] font-bold text-[#1c1c1e]">
                  {formatMonthLabel(currentMonth)}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-[#8e8e93]" />
                </button>
              </div>

              {reportsLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: 'Kutilgan',
                        value: reports?.expected_revenue ?? 0,
                        icon: <TrendingUp className="w-5 h-5" />,
                        color: '#007AFF',
                        bg: 'rgba(0,122,255,0.08)',
                      },
                      {
                        label: "Qabul qilindi",
                        value: reports?.total_received ?? 0,
                        icon: <Wallet className="w-5 h-5" />,
                        color: '#34C759',
                        bg: 'rgba(52,199,89,0.08)',
                      },
                      {
                        label: 'Qoldiq',
                        value: reports?.remaining_balance ?? 0,
                        icon: <TrendingDown className="w-5 h-5" />,
                        color: '#FF3B30',
                        bg: 'rgba(255,59,48,0.08)',
                      },
                      {
                        label: 'Oldindan',
                        value: reports?.prepaid_amount ?? 0,
                        icon: <AlertCircle className="w-5 h-5" />,
                        color: '#FF9500',
                        bg: 'rgba(255,149,0,0.08)',
                      },
                    ].map((kpi, i) => (
                      <div
                        key={i}
                        className="px-4 py-4 bg-white rounded-2xl"
                        style={{
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                          style={{ background: kpi.bg, color: kpi.color }}
                        >
                          {kpi.icon}
                        </div>
                        <p className="text-[11px] text-[#8e8e93] font-medium mb-1">{kpi.label}</p>
                        <p
                          className="text-[17px] font-bold tracking-tight"
                          style={{ color: '#1c1c1e' }}
                        >
                          {formatCurrency(kpi.value)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  {reports && reports.expected_revenue > 0 && (
                    <div
                      className="px-4 py-4 bg-white rounded-2xl"
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.05)' }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[13px] font-semibold text-[#1c1c1e]">To'lov foizi</p>
                        <p className="text-[13px] font-bold text-[#007AFF]">
                          {Math.round((reports.total_received / reports.expected_revenue) * 100)}%
                        </p>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: '#F5F5F7' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min((reports.total_received / reports.expected_revenue) * 100, 100)}%`,
                            background: 'linear-gradient(90deg, #007AFF, #34C759)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Pie chart */}
                  {reports?.payment_methods &&
                    Object.values(reports.payment_methods).some((v) => (v ?? 0) > 0) && (
                      <div
                        className="px-4 py-4 bg-white rounded-2xl"
                        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.05)' }}
                      >
                        <p className="text-[13px] font-semibold text-[#1c1c1e] mb-4">
                          To'lov usullari
                        </p>
                        <div className="flex items-center gap-4">
                          <ResponsiveContainer width={120} height={120}>
                            <PieChart>
                              <Pie
                                data={Object.entries(reports.payment_methods)
                                  .filter(([, v]) => (v ?? 0) > 0)
                                  .map(([method, amount]) => ({
                                    name: METHOD_META[method]?.label ?? method,
                                    value: amount ?? 0,
                                  }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={55}
                                dataKey="value"
                                paddingAngle={3}
                              >
                                {Object.keys(reports.payment_methods).map((_, idx) => (
                                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v) => formatCurrency(v as number)} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-2">
                            {Object.entries(reports.payment_methods)
                              .filter(([, v]) => (v ?? 0) > 0)
                              .map(([method, amount], idx) => (
                                <div key={method} className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <div
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                                    />
                                    <span className="text-[12px] text-[#3c3c43]">
                                      {METHOD_META[method]?.label ?? method}
                                    </span>
                                  </div>
                                  <span className="text-[12px] font-semibold text-[#1c1c1e]">
                                    {formatCurrency(amount ?? 0)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Status breakdown */}
                  {(() => {
                    const [y, m] = currentMonth.split('-').map(Number);
                    const monthPayments = payments.filter((p) => {
                      const d = new Date(p.created_at || 0);
                      return d.getFullYear() === y && d.getMonth() + 1 === m;
                    });
                    const paidCount = monthPayments.filter((p) => p.status === 'paid').length;
                    const partialCount = monthPayments.filter((p) => p.status === 'partial').length;
                    const prepaidCount = monthPayments.filter((p) => p.status === 'prepaid').length;
                    const total = monthPayments.length;
                    if (total === 0) return null;
                    return (
                      <div
                        className="px-4 py-4 bg-white rounded-2xl"
                        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.05)' }}
                      >
                        <p className="text-[13px] font-semibold text-[#1c1c1e] mb-3">To'lovlar holati</p>
                        <div className="space-y-2.5">
                          {[
                            { label: "To'liq to'landi", count: paidCount, color: '#34C759', bg: 'rgba(52,199,89,0.1)' },
                            { label: "Qisman to'landi", count: partialCount, color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
                            { label: 'Oldindan (prepaid)', count: prepaidCount, color: '#007AFF', bg: 'rgba(0,122,255,0.1)' },
                          ].map((row) => (
                            <div key={row.label} className="flex items-center gap-3">
                              <div className="flex items-center gap-2 w-36 shrink-0">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                                <span className="text-[12px] text-[#3c3c43]">{row.label}</span>
                              </div>
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F5F5F7' }}>
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${total > 0 ? (row.count / total) * 100 : 0}%`, background: row.color }}
                                />
                              </div>
                              <span className="text-[12px] font-bold w-8 text-right shrink-0" style={{ color: row.color }}>
                                {row.count}
                              </span>
                            </div>
                          ))}
                          <p className="text-[11px] text-[#8e8e93] pt-1">Jami: {total} ta to'lov</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Export */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white text-[13px] font-semibold text-[#1c1c1e] transition-all duration-200 hover:bg-[#F5F5F7] active:scale-95"
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
                    >
                      <FileDown className="w-4 h-4 text-[#FF3B30]" />
                      PDF export
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white text-[13px] font-semibold text-[#1c1c1e] transition-all duration-200 hover:bg-[#F5F5F7] active:scale-95"
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
                    >
                      <FileDown className="w-4 h-4 text-[#34C759]" />
                      Excel export
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <PaymentFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingPayment(null); }}
        initial={editingPayment}
        onSubmit={handleSubmitForm}
        onSubmitMultiple={handleSubmitMultiple}
        loading={isLoading}
      />

      <PaymentDetailModal
        payment={detailPayment}
        onClose={() => setDetailPayment(null)}
        onEdit={(p) => openEdit(p)}
      />
    </div>
  );
}

// ─── Payment card component ───────────────────────────────────────────────────

function PaymentCard({
  payment,
  onClick,
}: {
  payment: Payment;
  onClick: () => void;
}) {
  const date = payment.created_at
    ? new Date(payment.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })
    : '';
  const isEdited =
    payment.updated_at &&
    payment.created_at &&
    new Date(payment.updated_at).getTime() - new Date(payment.created_at).getTime() > 2000;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl transition-all duration-200 cursor-pointer hover:shadow-md active:scale-[0.99]"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{
          background: `hsl(${((payment.student_id?.charCodeAt(5) ?? 0) * 47) % 360},55%,55%)`,
        }}
      >
        {payment.student?.first_name?.[0]}{payment.student?.last_name?.[0]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">
            {payment.student?.first_name} {payment.student?.last_name}
          </p>
          {isEdited && (
            <span
              className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(142,142,147,0.14)', color: '#8e8e93' }}
            >
              edited
            </span>
          )}
        </div>
        <p className="text-[12px] text-[#8e8e93] truncate">{payment.group?.name}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <MethodBadge method={payment.payment_method} />
          <StatusBadge status={payment.status} />
        </div>
      </div>

      {/* Amount + date */}
      <div className="text-right shrink-0">
        <p className="text-[16px] font-bold text-[#1c1c1e] tabular-nums">
          {formatCurrency(payment.amount)}
        </p>
        <p className="text-[11px] text-[#c7c7cc] mt-0.5">{date}</p>
      </div>
    </div>
  );
}

// ─── Payment detail modal ─────────────────────────────────────────────────────

const MONTH_NAMES_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

function PaymentDetailModal({
  payment,
  onClose,
  onEdit,
}: {
  payment: Payment | null;
  onClose: () => void;
  onEdit: (p: Payment) => void;
}) {
  if (!payment) return null;

  const createdDate = payment.created_at ? new Date(payment.created_at) : null;
  const updatedDate = payment.updated_at ? new Date(payment.updated_at) : null;
  const isEdited =
    updatedDate &&
    createdDate &&
    updatedDate.getTime() - createdDate.getTime() > 2000;

  const formatDateTime = (d: Date) =>
    d.toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) +
    ' · ' +
    d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  const [my_year, my_month] = (payment.month_year ?? '').split('-').map(Number);
  const monthLabel = my_month ? `${MONTH_NAMES_UZ[my_month - 1]} ${my_year}` : payment.month_year;

  const statusMeta = STATUS_META[payment.status] ?? STATUS_META.paid;
  const methodMeta = METHOD_META[payment.payment_method] ?? METHOD_META.other;
  const avatarHue = ((payment.student_id?.charCodeAt(5) ?? 0) * 47) % 360;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
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
          <h2 className="text-[17px] font-bold text-[#1c1c1e]">To'lov tafsiloti</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
          >
            <X className="w-4 h-4 text-[#8e8e93]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {/* Student card */}
          <div
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ background: '#F5F5F7' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: `hsl(${avatarHue},55%,55%)` }}
            >
              {payment.student?.first_name?.[0]}{payment.student?.last_name?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-[#1c1c1e] truncate">
                {payment.student?.first_name} {payment.student?.last_name}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {payment.student?.student_code && (
                  <span className="flex items-center gap-1 text-[11px] text-[#8e8e93]">
                    <Hash className="w-3 h-3" />
                    {payment.student.student_code}
                  </span>
                )}
                {payment.group?.name && (
                  <span className="flex items-center gap-1 text-[11px] text-[#8e8e93]">
                    <Users className="w-3 h-3" />
                    {payment.group.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="text-center py-2">
            <p className="text-[36px] font-bold text-[#1c1c1e] tabular-nums tracking-tight">
              {formatCurrency(payment.amount)}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                style={{ color: statusMeta.color, background: statusMeta.bg }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusMeta.color }} />
                {statusMeta.label}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                style={{ color: methodMeta.color, background: methodMeta.bg }}
              >
                {methodMeta.icon}
                {methodMeta.label}
              </span>
            </div>
          </div>

          {/* Details grid */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid #F5F5F7' }}
          >
            {[
              {
                icon: <Calendar className="w-4 h-4" />,
                label: 'Oy',
                value: monthLabel,
              },
              {
                icon: <Clock className="w-4 h-4" />,
                label: "To'langan vaqt",
                value: createdDate ? formatDateTime(createdDate) : '—',
              },
              ...(payment.note
                ? [{ icon: <MoreHorizontal className="w-4 h-4" />, label: 'Izoh', value: payment.note }]
                : []),
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className="flex items-start gap-3 px-4 py-3.5"
                style={{
                  borderBottom: i < arr.length - 1 ? '1px solid #F5F5F7' : 'none',
                }}
              >
                <span className="text-[#c7c7cc] shrink-0 mt-0.5">{row.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#8e8e93] font-medium uppercase tracking-wide mb-0.5">
                    {row.label}
                  </p>
                  <p className="text-[13px] font-semibold text-[#1c1c1e]">{row.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Edited info */}
          {isEdited && updatedDate && (
            <div
              className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
              style={{ background: 'rgba(142,142,147,0.1)', border: '1px solid rgba(142,142,147,0.18)' }}
            >
              <Pencil className="w-4 h-4 text-[#8e8e93] shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-[#8e8e93]">Tahrirlangan</p>
                <p className="text-[12px] text-[#aeaeb2] mt-0.5">{formatDateTime(updatedDate)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Edit button */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={() => onEdit(payment)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14px] font-semibold transition-all duration-200 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
              color: '#fff',
            }}
          >
            <Pencil className="w-4 h-4" />
            Tahrirlash
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
