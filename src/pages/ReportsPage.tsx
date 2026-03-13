import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ChevronLeft, ChevronRight, FileDown, FileSpreadsheet,
  TrendingUp, TrendingDown, Wallet, CreditCard, X, Search,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { writeFile, utils } from 'xlsx';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { api } from '../api/axios';
import { formatCurrency } from '../utils/formatCurrency';
import type { Payment, Debtor, PaymentReport } from '../types';

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const METHOD_CATEGORIES = [
  { key: 'cash',     label: 'Naqt',      color: '#10B981' },
  { key: 'transfer', label: "O'tkazma",  color: '#3B82F6' },
  { key: 'click',    label: 'Click',     color: '#F59E0B' },
  { key: 'payme',    label: 'Payme',     color: '#8B5CF6' },
  { key: 'other',    label: 'Boshqa',    color: '#6B7280' },
] as const;

const METHOD_LABELS: Record<string, string> = {
  cash: 'Naqt', transfer: "O'tkazma", click: 'Click',
  payme: 'Payme', card: 'Karta', other: 'Boshqa',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonthYear(my: string): [number, number] {
  const [y, m] = my.split('-').map(Number);
  return [y, m];
}

function prevMonthStr(my: string): string {
  const [y, m] = parseMonthYear(my);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

function nextMonthStr(my: string): string {
  const [y, m] = parseMonthYear(my);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

function monthLabel(my: string): string {
  const [, m] = parseMonthYear(my);
  return MONTH_NAMES[m - 1];
}

function fmtY(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  label, value, color, bg, icon,
}: { label: string; value: number; color: string; bg: string; icon: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-2xl p-4 flex flex-col gap-3"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg, color }}>
        {icon}
      </div>
      <div>
        <p className="text-[18px] font-bold text-[#1c1c1e] tabular-nums leading-tight">
          {formatCurrency(value)}
        </p>
        <p className="text-[11px] text-[#8e8e93] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Debtors Modal ─────────────────────────────────────────────────────────────

function DebtorsModal({
  debtors, currentMonth, onClose,
}: { debtors: Debtor[]; currentMonth: string; onClose: () => void }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    debtors.filter((d) => {
      const q = search.toLowerCase();
      const name = `${d.student?.first_name ?? ''} ${d.student?.last_name ?? ''}`.toLowerCase();
      return name.includes(q) || (d.group?.name ?? '').toLowerCase().includes(q);
    }),
    [debtors, search],
  );

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Qarzdorlar ro'yxati", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['#', "Ism Familiya", 'Guruh', 'Qarz summasi']],
      body: filtered.map((d, i) => [
        i + 1,
        `${d.student?.first_name ?? ''} ${d.student?.last_name ?? ''}`,
        d.group?.name ?? '',
        formatCurrency(d.total_debt),
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [239, 68, 68] },
    });
    doc.save(`teachflow-qarzdorlar-${currentMonth}.pdf`);
  };

  const exportExcel = () => {
    const ws = utils.aoa_to_sheet([
      ['#', "Ism Familiya", 'Guruh', 'Qarz summasi'],
      ...filtered.map((d, i) => [
        i + 1,
        `${d.student?.first_name ?? ''} ${d.student?.last_name ?? ''}`,
        d.group?.name ?? '',
        d.total_debt,
      ]),
    ]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Qarzdorlar');
    writeFile(wb, `teachflow-qarzdorlar-${currentMonth}.xlsx`);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-lg bg-white sm:rounded-[28px] rounded-t-[28px] overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh', boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#e5e5ea]" />
        </div>
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 className="text-[17px] font-bold text-[#1c1c1e]">Eng katta qarzdorlar</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X className="w-4 h-4 text-[#8e8e93]" />
          </button>
        </div>
        <div className="px-5 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e93]" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Qidirish..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F0F4FB] text-[13px] outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-3">
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F0F4FB] text-[12px] font-semibold text-[#1c1c1e]">
            <FileDown className="w-3.5 h-3.5 text-red-500" /> PDF
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F0F4FB] text-[12px] font-semibold text-[#1c1c1e]">
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" /> Excel
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {filtered.length === 0 ? (
            <p className="text-[13px] text-[#8e8e93] text-center py-8">Ma'lumot topilmadi</p>
          ) : filtered.map((d, idx) => (
            <div key={d.student_id} className="flex items-center gap-3 py-3 border-b border-[#F5F5F7] last:border-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                style={{ background: '#EF4444' }}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1c1c1e] truncate">
                  {d.student?.first_name} {d.student?.last_name}
                </p>
                <p className="text-[11px] text-[#8e8e93] truncate">{d.group?.name}</p>
              </div>
              <p className="text-[13px] font-bold text-[#EF4444] tabular-nums shrink-0">
                {formatCurrency(d.total_debt)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Paid Students Modal ───────────────────────────────────────────────────────

function PaidStudentsModal({
  payments, currentMonth, onClose,
}: { payments: Payment[]; currentMonth: string; onClose: () => void }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    payments.filter((p) => {
      const q = search.toLowerCase();
      const name = `${p.student?.first_name ?? ''} ${p.student?.last_name ?? ''}`.toLowerCase();
      return name.includes(q) || (p.group?.name ?? '').toLowerCase().includes(q);
    }),
    [payments, search],
  );

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("To'lagan o'quvchilar", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['#', 'Ism', 'Guruh', "To'lov summasi", "To'lov usuli", 'Sana']],
      body: filtered.map((p, i) => [
        i + 1,
        `${p.student?.first_name ?? ''} ${p.student?.last_name ?? ''}`,
        p.group?.name ?? '',
        formatCurrency(p.amount),
        METHOD_LABELS[p.payment_method] ?? p.payment_method,
        p.created_at ? new Date(p.created_at).toLocaleDateString('uz-UZ') : '',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] },
    });
    doc.save(`teachflow-tolaganlar-${currentMonth}.pdf`);
  };

  const exportExcel = () => {
    const ws = utils.aoa_to_sheet([
      ['#', 'Ism', 'Guruh', "To'lov summasi", "To'lov usuli", 'Sana'],
      ...filtered.map((p, i) => [
        i + 1,
        `${p.student?.first_name ?? ''} ${p.student?.last_name ?? ''}`,
        p.group?.name ?? '',
        p.amount,
        METHOD_LABELS[p.payment_method] ?? p.payment_method,
        p.created_at ? new Date(p.created_at).toLocaleDateString('uz-UZ') : '',
      ]),
    ]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "To'laganlar");
    writeFile(wb, `teachflow-tolaganlar-${currentMonth}.xlsx`);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-lg bg-white sm:rounded-[28px] rounded-t-[28px] overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh', boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#e5e5ea]" />
        </div>
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 className="text-[17px] font-bold text-[#1c1c1e]">To'lagan o'quvchilar</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X className="w-4 h-4 text-[#8e8e93]" />
          </button>
        </div>
        <div className="px-5 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e93]" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Qidirish..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F0F4FB] text-[13px] outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-3">
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F0F4FB] text-[12px] font-semibold text-[#1c1c1e]">
            <FileDown className="w-3.5 h-3.5 text-red-500" /> PDF
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F0F4FB] text-[12px] font-semibold text-[#1c1c1e]">
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" /> Excel
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {filtered.length === 0 ? (
            <p className="text-[13px] text-[#8e8e93] text-center py-8">Ma'lumot topilmadi</p>
          ) : filtered.map((p, idx) => (
            <div key={p.id} className="flex items-center gap-3 py-3 border-b border-[#F5F5F7] last:border-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                style={{ background: '#10B981' }}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1c1c1e] truncate">
                  {p.student?.first_name} {p.student?.last_name}
                </p>
                <p className="text-[11px] text-[#8e8e93] truncate">
                  {p.group?.name} · {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-bold text-[#10B981] tabular-nums">
                  {formatCurrency(p.amount)}
                </p>
                <p className="text-[10px] text-[#8e8e93]">
                  {p.created_at ? new Date(p.created_at).toLocaleDateString('uz-UZ') : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [currentMonth, setCurrentMonth] = useState(getNow);
  const [debtorsModal, setDebtorsModal] = useState(false);
  const [paidModal, setPaidModal] = useState(false);

  const currentYear = parseInt(currentMonth.split('-')[0]);
  const currentMonthIdx = parseInt(currentMonth.split('-')[1]) - 1;

  // ── API queries ─────────────────────────────────────────────────────────────

  const { data: report, isLoading: reportLoading } = useQuery<PaymentReport>({
    queryKey: ['reports', 'monthly', currentMonth],
    queryFn: async () => {
      const res = await api.get<PaymentReport | { data: PaymentReport }>('/payments/reports', {
        params: { month_year: currentMonth },
      });
      const raw = res.data;
      return (raw as { data: PaymentReport }).data ?? (raw as PaymentReport);
    },
    staleTime: 60_000,
  });

  const { data: debtors = [], isLoading: debtorsLoading } = useQuery<Debtor[]>({
    queryKey: ['reports', 'debtors'],
    queryFn: async () => {
      const res = await api.get<Debtor[] | { data: Debtor[] }>('/payments/debtors');
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw as { data: Debtor[] }).data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: paidStudents = [], isLoading: paidLoading } = useQuery<Payment[]>({
    queryKey: ['reports', 'paid', currentMonth],
    queryFn: async () => {
      const res = await api.get<Payment[] | { data: Payment[] }>('/payments', {
        params: { status: 'paid', month_year: currentMonth },
      });
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw as { data: Payment[] }).data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: allPayments = [] } = useQuery<Payment[]>({
    queryKey: ['reports', 'all-payments'],
    queryFn: async () => {
      const res = await api.get<Payment[] | { data: Payment[] }>('/payments');
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw as { data: Payment[] }).data ?? [];
    },
    staleTime: 60_000,
  });

  // ── Chart data (current year bars + prev year line) ─────────────────────────

  const chartData = useMemo(() =>
    MONTH_NAMES.map((name, idx) => {
      const month = idx + 1;
      const currKey = `${currentYear}-${String(month).padStart(2, '0')}`;
      const prevKey = `${currentYear - 1}-${String(month).padStart(2, '0')}`;
      const joriy = allPayments
        .filter((p) => p.month_year === currKey)
        .reduce((s, p) => s + p.amount, 0);
      const otgan = allPayments
        .filter((p) => p.month_year === prevKey)
        .reduce((s, p) => s + p.amount, 0);
      return { name: name.slice(0, 3), joriy, otgan };
    }),
    [allPayments, currentYear],
  );

  const currMonthChartTotal = chartData[currentMonthIdx]?.joriy ?? 0;
  const prevMonthChartTotal = chartData[currentMonthIdx > 0 ? currentMonthIdx - 1 : 11]?.joriy ?? 0;
  const pctChange = prevMonthChartTotal > 0
    ? (currMonthChartTotal - prevMonthChartTotal) / prevMonthChartTotal * 100
    : null;

  // ── Methods breakdown from report ──────────────────────────────────────────

  const methodsData = useMemo(() => {
    const pm = report?.payment_methods ?? {};
    const amounts: Record<string, number> = {
      cash:     (pm as Record<string, number>).cash     ?? 0,
      transfer: (pm as Record<string, number>).transfer ?? 0,
      click:    (pm as Record<string, number>).click    ?? 0,
      payme:    (pm as Record<string, number>).payme    ?? 0,
      other:    ((pm as Record<string, number>).other ?? 0) + ((pm as Record<string, number>).card ?? 0),
    };
    const total = Object.values(amounts).reduce((s, v) => s + v, 0);
    return METHOD_CATEGORIES.map((m) => ({
      ...m,
      amount: amounts[m.key] ?? 0,
      percent: total > 0 ? Math.round(((amounts[m.key] ?? 0) / total) * 100) : 0,
    }));
  }, [report]);

  // ── Page-level PDF export ──────────────────────────────────────────────────

  const exportReportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(`TeachFlow Hisoboti — ${monthLabel(currentMonth)} ${currentYear}`, 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [["Ko'rsatkich", 'Summa']],
      body: [
        ['Kutilgan daromad', formatCurrency(report?.expected_revenue ?? 0)],
        ['Tushum',           formatCurrency(report?.total_received   ?? 0)],
        ['Qarzdorlik',       formatCurrency(report?.remaining_balance ?? 0)],
        ["Oldindan to'lov",  formatCurrency(report?.prepaid_amount    ?? 0)],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    const y1 = (doc as Record<string, Record<string, number>>).lastAutoTable?.finalY ?? 90;
    doc.setFontSize(13);
    doc.text("To'lov usullari", 14, y1 + 8);
    autoTable(doc, {
      startY: y1 + 12,
      head: [['Usul', 'Summa', '%']],
      body: methodsData.map((m) => [m.label, formatCurrency(m.amount), `${m.percent}%`]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`teachflow-hisobot-${currentMonth}.pdf`);
  };

  const exportReportExcel = () => {
    const wb = utils.book_new();

    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ["Ko'rsatkich", 'Summa'],
      ['Kutilgan daromad', report?.expected_revenue ?? 0],
      ['Tushum',           report?.total_received   ?? 0],
      ['Qarzdorlik',       report?.remaining_balance ?? 0],
      ["Oldindan to'lov",  report?.prepaid_amount    ?? 0],
    ]), 'KPI');

    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ['Usul', 'Summa', '%'],
      ...methodsData.map((m) => [m.label, m.amount, m.percent]),
    ]), "To'lov usullari");

    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ['#', "Ism Familiya", 'Guruh', 'Qarz summasi'],
      ...debtors.map((d, i) => [
        i + 1,
        `${d.student?.first_name ?? ''} ${d.student?.last_name ?? ''}`,
        d.group?.name ?? '',
        d.total_debt,
      ]),
    ]), 'Qarzdorlar');

    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ['#', 'Ism', 'Guruh', "To'lov summasi", "To'lov usuli", 'Sana'],
      ...paidStudents.map((p, i) => [
        i + 1,
        `${p.student?.first_name ?? ''} ${p.student?.last_name ?? ''}`,
        p.group?.name ?? '',
        p.amount,
        METHOD_LABELS[p.payment_method] ?? p.payment_method,
        p.created_at ? new Date(p.created_at).toLocaleDateString('uz-UZ') : '',
      ]),
    ]), "To'laganlar");

    writeFile(wb, `teachflow-hisobot-${currentMonth}.xlsx`);
  };

  // ── Card shadow ────────────────────────────────────────────────────────────

  const shadow = { boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' };

  return (
    <div className="min-h-screen" style={{ background: '#F0F4FF' }}>
      <Sidebar />
      <main className="md:pl-[280px] pb-24 md:pb-8">
        <Header />
        <div className="px-4 md:px-6 max-w-6xl mx-auto space-y-4 pt-2">

          {/* ── Header ────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(prevMonthStr(currentMonth))}
                className="w-9 h-9 rounded-xl bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
                style={shadow}
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <div className="bg-white rounded-xl px-5 py-2.5 min-w-[160px] text-center" style={shadow}>
                <span className="text-[15px] font-semibold text-[#1c1c1e]">
                  {monthLabel(currentMonth)} {currentYear}
                </span>
              </div>
              <button
                onClick={() => setCurrentMonth(nextMonthStr(currentMonth))}
                className="w-9 h-9 rounded-xl bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
                style={shadow}
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportReportPDF}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[13px] font-semibold text-[#1c1c1e] hover:bg-gray-50 transition-colors"
                style={shadow}
              >
                <FileDown className="w-4 h-4 text-red-500" /> PDF
              </button>
              <button
                onClick={exportReportExcel}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[13px] font-semibold text-[#1c1c1e] hover:bg-gray-50 transition-colors"
                style={shadow}
              >
                <FileSpreadsheet className="w-4 h-4 text-green-500" /> Excel
              </button>
            </div>
          </div>

          {/* ── ROW 1: KPI cards ──────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {reportLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4" style={shadow}>
                  <Sk className="w-9 h-9 mb-3" />
                  <Sk className="h-6 w-3/4 mb-2" />
                  <Sk className="h-3 w-1/2" />
                </div>
              ))
            ) : (
              <>
                <KPICard
                  label="Kutilgan daromad"
                  value={report?.expected_revenue ?? 0}
                  color="#3B82F6" bg="rgba(59,130,246,0.1)"
                  icon={<TrendingUp className="w-4 h-4" />}
                />
                <KPICard
                  label="Tushum"
                  value={report?.total_received ?? 0}
                  color="#10B981" bg="rgba(16,185,129,0.1)"
                  icon={<Wallet className="w-4 h-4" />}
                />
                <KPICard
                  label="Qarzdorlik"
                  value={report?.remaining_balance ?? 0}
                  color="#EF4444" bg="rgba(239,68,68,0.1)"
                  icon={<TrendingDown className="w-4 h-4" />}
                />
                <KPICard
                  label="Oldindan to'lov"
                  value={report?.prepaid_amount ?? 0}
                  color="#8B5CF6" bg="rgba(139,92,246,0.1)"
                  icon={<CreditCard className="w-4 h-4" />}
                />
              </>
            )}
          </div>

          {/* ── ROW 2: Chart + Methods ─────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">

            {/* Chart card */}
            <div className="bg-white rounded-2xl p-5 flex flex-col" style={shadow}>
              <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
                <div>
                  <p className="text-[15px] font-bold text-[#1c1c1e]">Daromad dinamikasi</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-[13px] text-[#8e8e93]">
                      {monthLabel(currentMonth)}:{' '}
                      <strong className="text-[#1c1c1e]">
                        {formatCurrency(report?.total_received ?? 0)}
                      </strong>
                    </p>
                    {pctChange !== null && (
                      <span
                        className="text-[12px] font-semibold px-2 py-0.5 rounded-lg"
                        style={
                          pctChange >= 0
                            ? { color: '#10B981', background: 'rgba(16,185,129,0.1)' }
                            : { color: '#EF4444', background: 'rgba(239,68,68,0.1)' }
                        }
                      >
                        {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-[#8e8e93] shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[#3B82F6]" />
                    <span>Joriy yil</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 border-t-2 border-dashed border-[#9CA3AF]" />
                    <span>O'tgan yil</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-[220px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FB" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#b0b8cc' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#b0b8cc' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={fmtY}
                      width={42}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'joriy' ? 'Joriy yil' : "O'tgan yil",
                      ]}
                      contentStyle={{
                        borderRadius: 12, border: 'none',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12,
                      }}
                    />
                    <Bar dataKey="joriy" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Line
                      type="monotone" dataKey="otgan"
                      stroke="#9CA3AF" strokeWidth={2} strokeDasharray="4 3" dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Methods card */}
            <div className="bg-white rounded-2xl p-5 flex flex-col" style={shadow}>
              <p className="text-[15px] font-bold text-[#1c1c1e] mb-4">To'lov usullari</p>
              {reportLoading ? (
                <div className="flex-1 space-y-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-2">
                        <Sk className="w-3 h-3 rounded-full" />
                        <Sk className="h-4 flex-1" />
                        <Sk className="h-4 w-20" />
                      </div>
                      <Sk className="h-1.5 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  {methodsData.map((m) => (
                    <div key={m.key}>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: m.color }} />
                        <span className="text-[13px] font-medium text-[#1c1c1e] flex-1 truncate">
                          {m.label}
                        </span>
                        <span className="text-[13px] font-semibold text-[#1c1c1e] tabular-nums">
                          {formatCurrency(m.amount)}
                        </span>
                        <span className="text-[12px] text-[#8e8e93] tabular-nums w-9 text-right shrink-0">
                          {m.percent}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F0F4FB' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${m.percent}%`, background: m.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── ROW 3: Debtors + Paid students ────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Debtors card */}
            <div className="bg-white rounded-2xl p-5" style={shadow}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[15px] font-bold text-[#1c1c1e]">Eng katta qarzdorlar</p>
                {debtors.length > 10 && (
                  <button
                    onClick={() => setDebtorsModal(true)}
                    className="text-[12px] font-semibold text-[#3B82F6] hover:underline"
                  >
                    Barchasini ko'rish
                  </button>
                )}
              </div>
              {debtorsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Sk className="w-9 h-9 rounded-full shrink-0" />
                      <div className="flex-1"><Sk className="h-4 w-3/4 mb-1" /><Sk className="h-3 w-1/2" /></div>
                      <Sk className="h-4 w-20 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : debtors.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[14px] text-[#8e8e93]">Qarzdorlar yo'q</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {debtors.slice(0, 10).map((d, idx) => (
                      <div key={d.student_id} className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                          style={{ background: '#EF4444' }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#1c1c1e] truncate">
                            {d.student?.first_name} {d.student?.last_name}
                          </p>
                          <p className="text-[11px] text-[#8e8e93] truncate">{d.group?.name}</p>
                        </div>
                        <p className="text-[13px] font-bold text-[#EF4444] tabular-nums shrink-0">
                          {formatCurrency(d.total_debt)}
                        </p>
                      </div>
                    ))}
                  </div>
                  {debtors.length > 10 && (
                    <button
                      onClick={() => setDebtorsModal(true)}
                      className="w-full mt-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.98]"
                      style={{ background: 'rgba(239,68,68,0.07)', color: '#EF4444' }}
                    >
                      Barchasini ko'rish ({debtors.length})
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Paid students card */}
            <div className="bg-white rounded-2xl p-5" style={shadow}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[15px] font-bold text-[#1c1c1e]">To'lagan o'quvchilar</p>
                {paidStudents.length > 10 && (
                  <button
                    onClick={() => setPaidModal(true)}
                    className="text-[12px] font-semibold text-[#3B82F6] hover:underline"
                  >
                    Barchasini ko'rish
                  </button>
                )}
              </div>
              {paidLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Sk className="w-9 h-9 rounded-full shrink-0" />
                      <div className="flex-1"><Sk className="h-4 w-3/4 mb-1" /><Sk className="h-3 w-1/2" /></div>
                      <Sk className="h-4 w-20 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : paidStudents.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[14px] text-[#8e8e93]">
                    {monthLabel(currentMonth)} oyida to'lovlar topilmadi
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paidStudents.slice(0, 10).map((p, idx) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                          style={{ background: '#10B981' }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#1c1c1e] truncate">
                            {p.student?.first_name} {p.student?.last_name}
                          </p>
                          <p className="text-[11px] text-[#8e8e93] truncate">{p.group?.name}</p>
                        </div>
                        <p className="text-[13px] font-bold text-[#10B981] tabular-nums shrink-0">
                          {formatCurrency(p.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                  {paidStudents.length > 10 && (
                    <button
                      onClick={() => setPaidModal(true)}
                      className="w-full mt-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.98]"
                      style={{ background: 'rgba(16,185,129,0.07)', color: '#10B981' }}
                    >
                      Barchasini ko'rish ({paidStudents.length})
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </main>

      {debtorsModal && (
        <DebtorsModal
          debtors={debtors}
          currentMonth={currentMonth}
          onClose={() => setDebtorsModal(false)}
        />
      )}
      {paidModal && (
        <PaidStudentsModal
          payments={paidStudents}
          currentMonth={currentMonth}
          onClose={() => setPaidModal(false)}
        />
      )}
    </div>
  );
}
