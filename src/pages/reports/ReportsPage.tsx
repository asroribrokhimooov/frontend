import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, Users, GraduationCap,
  FileDown, AlertCircle, ChevronLeft, ChevronRight, Banknote,
  ArrowLeftRight, Smartphone, Building2, MoreHorizontal,
} from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { DEMO_PAYMENTS, DEMO_DEBTORS } from '../../data/demoPayments';
import { DEMO_GROUPS } from '../../data/demoGroups';
import { DEMO_STUDENTS } from '../../data/demoStudents';
import { formatCurrency } from '../../utils/formatCurrency';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { writeFile, utils } from 'xlsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const AVAILABLE_MONTHS = ['2026-01', '2026-02', '2026-03'];

const METHOD_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cash:     { label: 'Naqt',      icon: <Banknote className="w-3.5 h-3.5" />,      color: '#34C759' },
  transfer: { label: "O'tkazma",  icon: <ArrowLeftRight className="w-3.5 h-3.5" />, color: '#8B5CF6' },
  click:    { label: 'Click',     icon: <Smartphone className="w-3.5 h-3.5" />,    color: '#FF9500' },
  payme:    { label: 'Payme',     icon: <Building2 className="w-3.5 h-3.5" />,     color: '#007AFF' },
  card:     { label: 'Karta',     icon: <Wallet className="w-3.5 h-3.5" />,        color: '#5AC8FA' },
  other:    { label: 'Boshqa',    icon: <MoreHorizontal className="w-3.5 h-3.5" />, color: '#8E8E93' },
};

const PIE_COLORS = ['#007AFF', '#34C759', '#FF9500', '#8B5CF6', '#5AC8FA', '#FF3B30'];

function formatMonthLabel(monthYear: string): string {
  const [year, month] = monthYear.split('-').map(Number);
  return `${MONTH_NAMES_UZ[month - 1]} ${year}`;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState('2026-03');

  // Payments for selected month
  const monthPayments = useMemo(() => {
    return DEMO_PAYMENTS.filter((p) => p.month_year === selectedMonth);
  }, [selectedMonth]);

  // KPI calculations
  const totalReceived = monthPayments.reduce((s, p) => s + p.amount, 0);
  const expectedRevenue = DEMO_GROUPS.reduce((s, g) => s + g.monthly_fee * (g.students_count ?? 0), 0);
  const remaining = Math.max(0, expectedRevenue - totalReceived);
  const prepaidAmount = monthPayments
    .filter((p) => p.status === 'prepaid')
    .reduce((s, p) => s + p.amount, 0);

  const paidCount    = monthPayments.filter((p) => p.status === 'paid').length;
  const partialCount = monthPayments.filter((p) => p.status === 'partial').length;
  const prepaidCount = monthPayments.filter((p) => p.status === 'prepaid').length;

  // Monthly bar chart data
  const barData = AVAILABLE_MONTHS.map((mk) => {
    const m = Number(mk.split('-')[1]);
    const ps = DEMO_PAYMENTS.filter((p) => p.month_year === mk);
    return {
      name: MONTH_NAMES_UZ[m - 1],
      received: ps.reduce((s, p) => s + p.amount, 0),
      count: ps.length,
    };
  });

  // Payment method breakdown
  const methodData = Object.entries(
    monthPayments.reduce((acc, p) => {
      acc[p.payment_method] = (acc[p.payment_method] ?? 0) + p.amount;
      return acc;
    }, {} as Record<string, number>)
  )
    .filter(([, v]) => v > 0)
    .map(([method, amount]) => ({
      name: METHOD_META[method]?.label ?? method,
      value: amount,
      color: METHOD_META[method]?.color ?? '#8E8E93',
    }));

  // Group stats
  const groupStats = DEMO_GROUPS.map((group) => {
    const gPayments = monthPayments.filter((p) => p.group_id === group.id);
    const received  = gPayments.reduce((s, p) => s + p.amount, 0);
    const expected  = group.monthly_fee * (group.students_count ?? 0);
    const percent   = expected > 0 ? Math.round((received / expected) * 100) : 0;
    return { group, received, expected, percent, count: gPayments.length };
  });

  const handlePrev = () => {
    const idx = AVAILABLE_MONTHS.indexOf(selectedMonth);
    if (idx > 0) setSelectedMonth(AVAILABLE_MONTHS[idx - 1]);
  };
  const handleNext = () => {
    const idx = AVAILABLE_MONTHS.indexOf(selectedMonth);
    if (idx < AVAILABLE_MONTHS.length - 1) setSelectedMonth(AVAILABLE_MONTHS[idx + 1]);
  };

  // Export handlers
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(16);
    doc.text(`TeachFlow — Hisobot: ${formatMonthLabel(selectedMonth)}`, pageW / 2, 15, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 15, 23);
    doc.setTextColor(0, 0, 0);

    // 1. KPI Summary
    doc.setFontSize(11);
    doc.text("Asosiy ko'rsatkichlar", 15, 31);
    autoTable(doc, {
      head: [["Ko'rsatkich", "Summa (so'm)"]],
      body: [
        ['Kutilgan daromad',    formatCurrency(expectedRevenue)],
        ['Qabul qilindi',       formatCurrency(totalReceived)],
        ['Qoldiq (qarz)',       formatCurrency(remaining)],
        ["Oldindan to'lov",     formatCurrency(prepaidAmount)],
        ["To'lov foizi",        `${paymentPercent}%`],
      ],
      startY: 34,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 119, 182] },
    });

    // 2. Monthly revenue
    const y1 = (doc as Record<string, Record<string, number>>).lastAutoTable?.finalY ?? 90;
    doc.setFontSize(11);
    doc.text('Oylik daromad dinamikasi', 15, y1 + 8);
    autoTable(doc, {
      head: [['Oy', "Qabul qilindi (so'm)", "To'lovlar soni"]],
      body: barData.map((row) => [row.name, formatCurrency(row.received), row.count]),
      startY: y1 + 11,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 119, 182] },
    });

    // 3. Payment methods
    const y2 = (doc as Record<string, Record<string, number>>).lastAutoTable?.finalY ?? 140;
    doc.setFontSize(11);
    doc.text("To'lov usullari", 15, y2 + 8);
    autoTable(doc, {
      head: [['Usul', "Summa (so'm)", '%']],
      body: methodData.map((m) => {
        const total = methodData.reduce((s, x) => s + x.value, 0);
        return [m.name, formatCurrency(m.value), total > 0 ? `${Math.round((m.value / total) * 100)}%` : '0%'];
      }),
      startY: y2 + 11,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 119, 182] },
    });

    // 4. Payment status
    const y3 = (doc as Record<string, Record<string, number>>).lastAutoTable?.finalY ?? 180;
    doc.setFontSize(11);
    doc.text("To'lovlar holati", 15, y3 + 8);
    autoTable(doc, {
      head: [['Holat', 'Soni']],
      body: [
        ["To'liq to'landi",   paidCount],
        ["Qisman to'landi",   partialCount],
        ['Oldindan (prepaid)', prepaidCount],
        ['Jami',              monthPayments.length],
      ],
      startY: y3 + 11,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 119, 182] },
    });

    // 5. Group stats (new page if needed)
    doc.addPage();
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Guruhlar bo'yicha", 15, 15);
    autoTable(doc, {
      head: [['Guruh', 'Kutilgan', 'Qabul qilindi', '%', "To'lovlar"]],
      body: groupStats.map(({ group, expected, received, percent, count }) => [
        group.name,
        formatCurrency(expected),
        formatCurrency(received),
        `${percent}%`,
        count,
      ]),
      startY: 18,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 119, 182] },
    });

    doc.save(`hisobot-${selectedMonth}.pdf`);
  };

  const handleExportExcel = () => {
    const wb = utils.book_new();

    // Sheet 1: KPI
    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ["Ko'rsatkich", "Summa (so'm)"],
      ['Kutilgan daromad',    expectedRevenue],
      ['Qabul qilindi',       totalReceived],
      ['Qoldiq (qarz)',       remaining],
      ["Oldindan to'lov",     prepaidAmount],
      ["To'lov foizi (%)",    paymentPercent],
    ]), 'KPI');

    // Sheet 2: Monthly revenue
    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ['Oy', "Qabul qilindi (so'm)", "To'lovlar soni"],
      ...barData.map((row) => [row.name, row.received, row.count]),
    ]), 'Oylik daromad');

    // Sheet 3: Payment methods
    const methodTotal = methodData.reduce((s, m) => s + m.value, 0);
    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ['Usul', "Summa (so'm)", '%'],
      ...methodData.map((m) => [
        m.name,
        m.value,
        methodTotal > 0 ? Math.round((m.value / methodTotal) * 100) : 0,
      ]),
    ]), "To'lov usullari");

    // Sheet 4: Payment status
    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ['Holat', 'Soni'],
      ["To'liq to'landi",   paidCount],
      ["Qisman to'landi",   partialCount],
      ['Oldindan (prepaid)', prepaidCount],
      ['Jami',              monthPayments.length],
    ]), 'Holat');

    // Sheet 5: Group stats
    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ['Guruh', "Kutilgan (so'm)", "Qabul qilindi (so'm)", '%', "To'lovlar soni"],
      ...groupStats.map(({ group, expected, received, percent, count }) => [
        group.name, expected, received, percent, count,
      ]),
    ]), 'Guruhlar');

    writeFile(wb, `hisobot-${selectedMonth}.xlsx`);
  };

  const paymentPercent = expectedRevenue > 0
    ? Math.min(Math.round((totalReceived / expectedRevenue) * 100), 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Sidebar />
      <main className="md:pl-[280px] pb-24 md:pb-8">
        <Header />

        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

          {/* ── Page header ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-bold text-[#1c1c1e] tracking-tight">Hisobotlar</h1>
              <p className="text-[13px] text-[#8e8e93] mt-0.5">Demo ma'lumotlar asosida</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-[13px] font-semibold text-[#1c1c1e] transition-all duration-200 hover:bg-[#F5F5F7] active:scale-95"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
              >
                <FileDown className="w-4 h-4 text-[#FF3B30]" />
                PDF
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-[13px] font-semibold text-[#1c1c1e] transition-all duration-200 hover:bg-[#F5F5F7] active:scale-95"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
              >
                <FileDown className="w-4 h-4 text-[#34C759]" />
                Excel
              </button>
            </div>
          </div>

          {/* ── Month navigator ───────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
          >
            <button
              onClick={handlePrev}
              disabled={AVAILABLE_MONTHS.indexOf(selectedMonth) === 0}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#F5F5F7] transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5 text-[#8e8e93]" />
            </button>
            <span className="text-[15px] font-bold text-[#1c1c1e]">
              {formatMonthLabel(selectedMonth)}
            </span>
            <button
              onClick={handleNext}
              disabled={AVAILABLE_MONTHS.indexOf(selectedMonth) === AVAILABLE_MONTHS.length - 1}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#F5F5F7] transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5 text-[#8e8e93]" />
            </button>
          </div>

          {/* ── KPI cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Kutilgan',      value: expectedRevenue, icon: <TrendingUp className="w-5 h-5" />,   color: '#007AFF', bg: 'rgba(0,122,255,0.08)',   format: 'currency' },
              { label: 'Qabul qilindi', value: totalReceived,   icon: <Wallet className="w-5 h-5" />,       color: '#34C759', bg: 'rgba(52,199,89,0.08)',   format: 'currency' },
              { label: 'Qoldiq',        value: remaining,       icon: <TrendingDown className="w-5 h-5" />, color: '#FF3B30', bg: 'rgba(255,59,48,0.08)',   format: 'currency' },
              { label: 'Oldindan',      value: prepaidAmount,   icon: <AlertCircle className="w-5 h-5" />,  color: '#FF9500', bg: 'rgba(255,149,0,0.08)',   format: 'currency' },
            ].map((kpi, i) => (
              <div
                key={i}
                className="px-4 py-4 bg-white rounded-2xl"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.05)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: kpi.bg, color: kpi.color }}
                >
                  {kpi.icon}
                </div>
                <p className="text-[11px] text-[#8e8e93] font-medium mb-1">{kpi.label}</p>
                <p className="text-[17px] font-bold tracking-tight" style={{ color: '#1c1c1e' }}>
                  {formatCurrency(kpi.value)}
                </p>
              </div>
            ))}
          </div>

          {/* ── Payment progress ──────────────────────────────────────────── */}
          <div
            className="px-4 py-4 bg-white rounded-2xl"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.05)' }}
          >
            <div className="flex justify-between items-center mb-2">
              <p className="text-[13px] font-semibold text-[#1c1c1e]">To'lov foizi</p>
              <p className="text-[13px] font-bold text-[#007AFF]">{paymentPercent}%</p>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: '#F5F5F7' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${paymentPercent}%`,
                  background: 'linear-gradient(90deg, #007AFF, #34C759)',
                }}
              />
            </div>
            <p className="text-[11px] text-[#8e8e93] mt-2">
              {formatCurrency(totalReceived)} / {formatCurrency(expectedRevenue)}
            </p>
          </div>

          {/* ── Monthly revenue bar chart ─────────────────────────────────── */}
          <div
            className="px-4 py-4 bg-white rounded-2xl"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.05)' }}
          >
            <p className="text-[13px] font-semibold text-[#1c1c1e] mb-4">Oylik daromad dinamikasi</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#8e8e93' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                  tick={{ fontSize: 11, fill: '#8e8e93' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(v as number), 'Qabul qilindi']}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                />
                <Bar dataKey="received" fill="#007AFF" radius={[6, 6, 0, 0]} name="Qabul qilindi" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Payment methods pie ───────────────────────────────────────── */}
          {methodData.length > 0 && (
            <div
              className="px-4 py-4 bg-white rounded-2xl"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.05)' }}
            >
              <p className="text-[13px] font-semibold text-[#1c1c1e] mb-4">To'lov usullari</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={methodData}
                      cx="50%" cy="50%"
                      innerRadius={30} outerRadius={55}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {methodData.map((entry, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => formatCurrency(v as number)}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {methodData.map((entry, idx) => (
                    <div key={entry.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <span className="text-[12px] text-[#3c3c43]">{entry.name}</span>
                      </div>
                      <span className="text-[12px] font-semibold text-[#1c1c1e]">
                        {formatCurrency(entry.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Payment status breakdown ──────────────────────────────────── */}
          {monthPayments.length > 0 && (
            <div
              className="px-4 py-4 bg-white rounded-2xl"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.05)' }}
            >
              <p className="text-[13px] font-semibold text-[#1c1c1e] mb-3">To'lovlar holati</p>
              <div className="space-y-2.5">
                {[
                  { label: "To'liq to'landi",    count: paidCount,    color: '#34C759' },
                  { label: "Qisman to'landi",     count: partialCount, color: '#FF9500' },
                  { label: 'Oldindan (prepaid)',  count: prepaidCount, color: '#007AFF' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-40 shrink-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                      <span className="text-[12px] text-[#3c3c43]">{row.label}</span>
                    </div>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F5F5F7' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${monthPayments.length > 0 ? (row.count / monthPayments.length) * 100 : 0}%`,
                          background: row.color,
                        }}
                      />
                    </div>
                    <span className="text-[12px] font-bold w-6 text-right shrink-0" style={{ color: row.color }}>
                      {row.count}
                    </span>
                  </div>
                ))}
                <p className="text-[11px] text-[#8e8e93] pt-1">
                  Jami: {monthPayments.length} ta to'lov
                </p>
              </div>
            </div>
          )}

          {/* ── Group stats ───────────────────────────────────────────────── */}
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.05)' }}
          >
            <div className="px-4 py-3.5 border-b border-[#F5F5F7]">
              <p className="text-[13px] font-semibold text-[#1c1c1e]">Guruhlar bo'yicha</p>
            </div>
            {groupStats.map(({ group, expected, received, percent, count }, idx) => (
              <div
                key={group.id}
                className="px-4 py-3.5"
                style={{ borderBottom: idx < groupStats.length - 1 ? '1px solid #F5F5F7' : 'none' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: group.color ?? '#3B82F6' }}
                    />
                    <p className="text-[13px] font-semibold text-[#1c1c1e]">{group.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                      style={{
                        color:      percent >= 80 ? '#34C759' : percent >= 40 ? '#FF9500' : '#FF3B30',
                        background: percent >= 80 ? 'rgba(52,199,89,0.1)' : percent >= 40 ? 'rgba(255,149,0,0.1)' : 'rgba(255,59,48,0.1)',
                      }}
                    >
                      {percent}%
                    </span>
                    <span className="text-[11px] text-[#8e8e93]">{count} to'lov</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F5F5F7' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(percent, 100)}%`, background: group.color ?? '#3B82F6' }}
                    />
                  </div>
                  <p className="text-[11px] text-[#8e8e93] shrink-0">
                    {formatCurrency(received)} / {formatCurrency(expected)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Summary stats ─────────────────────────────────────────────── */}
          <div
            className="px-4 py-4 bg-white rounded-2xl"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.05)' }}
          >
            <p className="text-[13px] font-semibold text-[#1c1c1e] mb-3">Umumiy ma'lumot</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Jami o'quvchilar", value: DEMO_STUDENTS.length, icon: <Users className="w-4 h-4" />,        color: '#007AFF' },
                { label: 'Faol guruhlar',    value: DEMO_GROUPS.length,   icon: <GraduationCap className="w-4 h-4" />, color: '#34C759' },
                { label: 'Qarzdorlar',       value: DEMO_DEBTORS.length,  icon: <AlertCircle className="w-4 h-4" />,   color: '#FF3B30' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center py-3 rounded-xl"
                  style={{ background: '#F5F5F7' }}
                >
                  <div style={{ color: item.color }} className="mb-1">{item.icon}</div>
                  <p className="text-[20px] font-bold" style={{ color: '#1c1c1e' }}>{item.value}</p>
                  <p className="text-[10px] text-[#8e8e93] text-center leading-tight mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
