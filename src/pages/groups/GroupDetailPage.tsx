import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Users, AlertCircle, TrendingUp, CalendarDays, Clock,
  Settings, CreditCard, MessageSquare, Check, X as XIcon, Minus,
  Save, Archive, PauseCircle, PlayCircle, BookOpen, FileDown,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { writeFile, utils } from 'xlsx';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { useGroup, useUpdateGroup, useArchiveGroup } from '../../hooks/useGroups';
import { useCreateAttendanceBulk } from '../../hooks/useAttendance';
import { useStudents } from '../../hooks/useStudents';
import { ManageStudentsModal } from './ManageStudentsModal';
import { GroupQuickPaymentModal } from './GroupQuickPaymentModal';
import { formatCurrency } from '../../utils/formatCurrency';
import { cn } from '../../utils/cn';
import { api } from '../../api/axios';
import type { Student, AttendanceStatus, Group } from '../../types';
type TabType = 'students' | 'payments' | 'attendance' | 'settings';

interface DebtorItem {
  id: string;
  name: string;
  phone: string;
  debt: number;
}

const DAY_SHORT: Record<string, string> = {
  monday: 'Du', tuesday: 'Se', wednesday: 'Ch',
  thursday: 'Pa', friday: 'Ju', saturday: 'Sha', sunday: 'Yak',
};

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600',
    'bg-amber-100 text-amber-600', 'bg-purple-100 text-purple-600',
    'bg-rose-100 text-rose-600', 'bg-cyan-100 text-cyan-600',
    'bg-indigo-100 text-indigo-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ---- Debtors Modal ----
interface DebtorsModalProps {
  open: boolean;
  onClose: () => void;
  group: Group;
  debtors: DebtorItem[];
}

function DebtorsModal({ open, onClose, group, debtors }: DebtorsModalProps) {
  if (!open) return null;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`${group.name} — Qarzdorlar`, 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}   Jami: ${debtors.length} ta`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["#", "Ism Familiya", "Telefon", "Qarz (so'm)"]],
      body: debtors.map((d, i) => [
        i + 1,
        d.name,
        d.phone,
        formatCurrency(Math.abs(d.debt)),
      ]),
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 245, 245] },
    });
    doc.save(`${group.name}-qarzdorlar.pdf`);
  };

  const handleExportExcel = () => {
    const ws = utils.aoa_to_sheet([
      ['#', 'Ism Familiya', 'Telefon', "Qarz (so'm)"],
      ...debtors.map((d, i) => [i + 1, d.name, d.phone, Math.abs(d.debt)]),
    ]);
    ws['!cols'] = [{ wch: 4 }, { wch: 26 }, { wch: 16 }, { wch: 16 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Qarzdorlar');
    writeFile(wb, `${group.name}-qarzdorlar.xlsx`);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#1D1D1F]">Qarzdorlar</h2>
            <p className="text-xs text-gray-400 mt-0.5">{group.name} · {debtors.length} ta o'quvchi</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition-colors border border-rose-100"
              title="PDF yuklash"
            >
              <FileDown className="w-3.5 h-3.5" />
              PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-semibold transition-colors border border-emerald-100"
              title="Excel yuklash"
            >
              <FileDown className="w-3.5 h-3.5" />
              Excel
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {debtors.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <Check className="w-5 h-5 text-emerald-500" strokeWidth={3} />
              </div>
              <p className="text-sm font-semibold text-[#1D1D1F]">Qarzdor yo'q!</p>
              <p className="text-xs text-gray-400 mt-1">Barcha o'quvchilar to'lovni amalga oshirgan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {debtors.map((d, idx) => {
                const avatarColor = getAvatarColor(d.name);
                return (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-2xl bg-rose-50/60 border border-rose-100/80">
                    <span className="text-xs text-gray-400 w-5 shrink-0 font-medium">{idx + 1}</span>
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0', avatarColor)}>
                      {d.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1D1D1F] truncate">{d.name}</p>
                      <p className="text-xs text-gray-400">{d.phone}</p>
                    </div>
                    <span className="text-sm font-bold text-rose-600 shrink-0">
                      -{formatCurrency(Math.abs(d.debt))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {debtors.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-rose-50/40 rounded-b-3xl">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">Jami qarz:</span>
              <span className="text-base font-bold text-rose-600">
                -{formatCurrency(debtors.reduce((sum, d) => sum + Math.abs(d.debt), 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ---- Main Component ----
export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [manageStudentsOpen, setManageStudentsOpen] = useState(false);
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [debtorsModalOpen, setDebtorsModalOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  // Settings form state
  const [settingsName, setSettingsName] = useState('');
  const [settingsFee, setSettingsFee] = useState('');
  const [settingsTime, setSettingsTime] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Attendance state
  const [attendanceDate] = useState(new Date());
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  // Excused attendance state
  const [excusedEditId, setExcusedEditId] = useState<string | null>(null);
  const [excusedReason, setExcusedReason] = useState('');
  const [excusedUntil, setExcusedUntil] = useState('');
  const [excusedDetails, setExcusedDetails] = useState<Record<string, { reason: string; until: string }>>({});
  const [excusedError, setExcusedError] = useState('');

  const { data: group, isLoading: groupLoading, isError: groupError } = useGroup(id);
  const { data: allStudents = [] } = useStudents();
  const updateGroup = useUpdateGroup(id);
  const archiveGroup = useArchiveGroup(id);
  const createAttendanceBulk = useCreateAttendanceBulk();

  // Students in group
  const { data: groupStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students', 'group', id],
    queryFn: async (): Promise<Student[]> => {
      const res = await api.get<Student[] | { data: Student[] }>('/students', {
        params: { group_id: id },
      });
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw as { data: Student[] }).data ?? [];
    },
    enabled: !!id,
  });

  const debtorsList: DebtorItem[] = useMemo(() => {
    return groupStudents
      .filter((s) => Number(s.balance) < 0)
      .map((s) => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        phone: s.phone,
        debt: Number(s.balance),
      }));
  }, [groupStudents]);

  const debtorsCount = debtorsList.length;

  // Initialize settings form when group loads
  useEffect(() => {
    if (group) {
      setSettingsName(group.name);
      setSettingsFee(String(group.monthly_fee));
      setSettingsTime(group.lesson_time);
    }
  }, [group?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddStudents = () => {
    queryClient.invalidateQueries({ queryKey: ['students', 'group', id] });
    setManageStudentsOpen(false);
  };

  const handleRemoveStudents = () => {
    queryClient.invalidateQueries({ queryKey: ['students', 'group', id] });
    setManageStudentsOpen(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    updateGroup.mutate(
      { name: settingsName, monthly_fee: Number(settingsFee), lesson_time: settingsTime, lesson_days: group.lesson_days, color: group.color ?? '#3B82F6' },
      { onSuccess: () => { setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000); } }
    );
  };

  const handleArchive = () => {
    archiveGroup.mutate(undefined, { onSuccess: () => navigate('/groups') });
  };

  const handleAttendanceMark = (studentId: string, status: AttendanceStatus) => {
    // If clicking excused, open inline form (don't mark directly)
    if (status === 'excused') {
      if (attendanceMap[studentId] === 'excused') {
        // Toggle off
        setAttendanceMap((prev) => { const n = { ...prev }; delete n[studentId]; return n; });
        setExcusedDetails((prev) => { const n = { ...prev }; delete n[studentId]; return n; });
        setExcusedEditId(null);
      } else {
        setExcusedEditId(studentId);
        setExcusedReason('');
        setExcusedUntil('');
        setExcusedError('');
      }
      return;
    }
    // Close excused form if open for this student
    if (excusedEditId === studentId) setExcusedEditId(null);
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? ('absent' as AttendanceStatus) : status,
    }));
    setAttendanceSaved(false);
  };

  const handleExcusedSubmit = (studentId: string) => {
    if (!excusedReason.trim()) { setExcusedError("Sabab kiritilishi shart"); return; }
    if (!excusedUntil) { setExcusedError("Qaysi sanagacha sababli ekanini kiriting"); return; }
    setExcusedDetails((prev) => ({ ...prev, [studentId]: { reason: excusedReason.trim(), until: excusedUntil } }));
    setAttendanceMap((prev) => ({ ...prev, [studentId]: 'excused' }));
    setExcusedEditId(null);
    setAttendanceSaved(false);
  };

  const handleSaveAttendance = () => {
    if (!id) {
      setAttendanceSaved(true);
      setTimeout(() => setAttendanceSaved(false), 2000);
      return;
    }
    const dateStr = attendanceDate.toISOString().split('T')[0];
    const records = groupStudents.map((student) => ({
      group_id: id,
      student_id: student.id,
      date: dateStr,
      status: attendanceMap[student.id] ?? 'absent',
    }));
    createAttendanceBulk.mutate(
      { records },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['attendance', id] });
          setAttendanceSaved(true);
          setTimeout(() => setAttendanceSaved(false), 2000);
        },
        onError: () => {
          alert('Davomatni saqlashda xatolik yuz berdi. Qayta urinib ko\'ring.');
        },
      }
    );
  };

  if (groupLoading || !id) {
    return (
      <div className="min-h-screen bg-[#F0F4FF]">
        <Sidebar />
        <main className="md:pl-[280px] pb-20 md:pb-0">
          <Header />
          <div className="p-8 flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (groupError || !group) {
    return (
      <div className="min-h-screen bg-[#F0F4FF]">
        <Sidebar />
        <main className="md:pl-[280px] pb-20 md:pb-0">
          <Header />
          <div className="p-8">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
              Guruh topilmadi. <Link to="/groups" className="underline">Orqaga</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const groupColor = group.color ?? '#3B82F6';
  const statusLabel = group.is_archived ? 'ARXIV' : isPaused ? 'PAUZA' : 'FAOL';
  const statusClass = group.is_archived ? 'bg-gray-100 text-gray-500' : isPaused ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600';

  const tabs: { key: TabType; label: string }[] = [
    { key: 'students', label: "O'quvchilar & Davomat" },
    { key: 'payments', label: "To'lovlar tarixi" },
    { key: 'attendance', label: 'Davomat tarixi' },
    { key: 'settings', label: 'Sozlamalar' },
  ];

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Sidebar />
      <main className="md:pl-[280px] pb-20 md:pb-0">
        <Header />
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">

          {/* ---- TOP HEADER ---- */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Link to="/groups" className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-[#1D1D1F] hover:shadow-md transition-all">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#1D1D1F] tracking-tight">{group.name}</h1>
                <span className="text-sm font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-xl">{formatCurrency(group.monthly_fee)}/oy</span>
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-xl tracking-wide', statusClass)}>{statusLabel}</span>
              </div>
            </div>
            <button
              onClick={() => setManageStudentsOpen(true)}
              className="flex items-center gap-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold py-2.5 px-5 rounded-2xl shadow-sm shadow-blue-200 hover:shadow-md hover:scale-[1.02] transition-all duration-200 text-sm"
            >
              <Users className="w-4 h-4" />
              O'quvchilarni boshqarish
            </button>
          </div>

          {/* ---- KPI CARDS ---- */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
            {/* Students */}
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:block">O'QUVCHILAR</span>
              </div>
              <p className="text-2xl md:text-3xl font-extrabold text-[#1D1D1F]">{groupStudents.length}</p>
              <p className="text-xs text-gray-400 mt-0.5 sm:hidden">O'QUVCHILAR</p>
            </div>

            {/* Debtors — clickable */}
            <button
              onClick={() => debtorsCount > 0 && setDebtorsModalOpen(true)}
              className={cn(
                'bg-white rounded-2xl p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-left transition-all',
                debtorsCount > 0 ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-[0.98]' : 'cursor-default'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:block">QARZDORLAR</span>
              </div>
              <p className="text-2xl md:text-3xl font-extrabold text-[#1D1D1F]">{debtorsCount}</p>
              <p className="text-xs mt-0.5">
                <span className={cn('sm:hidden', debtorsCount > 0 ? 'text-rose-400' : 'text-gray-400')}>QARZDORLAR · </span>
                <span className={debtorsCount > 0 ? 'text-rose-400' : 'text-gray-400'}>ta o'quvchi{debtorsCount > 0 ? ' →' : ''}</span>
              </p>
            </button>

            {/* Revenue */}
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:block">JAMI TUSHUM</span>
              </div>
              <p className="text-xl md:text-2xl font-extrabold text-[#1D1D1F]">—</p>
              <p className="text-xs text-gray-400 mt-0.5"><span className="sm:hidden">JAMI TUSHUM · </span>so'm</p>
            </div>
          </div>

          {/* ---- TABS ---- */}
          <div className="flex gap-1 mb-6 bg-white rounded-2xl p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 min-w-max whitespace-nowrap py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200',
                  activeTab === tab.key ? 'bg-[#3B82F6] text-white shadow-sm shadow-blue-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ---- MAIN CONTENT + RIGHT SIDEBAR ---- */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0">

              {/* ===== STUDENTS & ATTENDANCE ===== */}
              {activeTab === 'students' && (
                <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                    <h2 className="text-base font-bold text-[#1D1D1F]">Davomat belgilash</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#3B82F6] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                        Bugun, {attendanceDate.toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}
                      </span>
                      <button
                        onClick={handleSaveAttendance}
                        className={cn(
                          'flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all',
                          attendanceSaved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-[#3B82F6] text-white shadow-sm shadow-blue-200 hover:bg-blue-600'
                        )}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {attendanceSaved ? 'Saqlandi' : 'Saqlash'}
                      </button>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-3 px-6 py-2.5 bg-gray-50/50 border-b border-gray-50 text-xs text-gray-400 font-medium">
                    <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-lg bg-emerald-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" strokeWidth={3} /></span> Keldi</div>
                    <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-lg bg-amber-400 flex items-center justify-center"><Minus className="w-3 h-3 text-white" strokeWidth={3} /></span> Kechikdi</div>
                    <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-lg bg-rose-500 flex items-center justify-center"><XIcon className="w-3 h-3 text-white" strokeWidth={3} /></span> Kelmadi</div>
                    <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-lg bg-indigo-400 flex items-center justify-center"><BookOpen className="w-3 h-3 text-white" /></span> Sababli</div>
                  </div>

                  {studentsLoading ? (
                    <div className="p-6 space-y-3">
                      {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />)}
                    </div>
                  ) : groupStudents.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 mb-4">
                        <Users className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-[#1D1D1F] mb-1">O'quvchilar yo'q</h3>
                      <p className="text-sm text-gray-400 mb-6 max-w-xs">Bu guruhda hali o'quvchi yo'q. O'quvchi qo'shing.</p>
                      <button
                        onClick={() => setManageStudentsOpen(true)}
                        className="flex items-center gap-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold py-2.5 px-5 rounded-2xl text-sm shadow-sm shadow-blue-200 transition-all"
                      >
                        + O'quvchi qo'shish
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {groupStudents.map((student, idx) => {
                        const fullName = `${student.first_name} ${student.last_name}`;
                        const avatarColor = getAvatarColor(fullName);
                        const att = attendanceMap[student.id];
                        const isEditingExcused = excusedEditId === student.id;
                        const savedExcuse = excusedDetails[student.id];

                        return (
                          <div key={student.id}>
                            <div className={cn(
                              'flex items-center gap-3 px-6 py-3.5 transition-colors',
                              isEditingExcused ? 'bg-indigo-50/60' : 'hover:bg-gray-50/60'
                            )}>
                              <span className="text-xs text-gray-300 font-medium w-5 shrink-0">{idx + 1}</span>
                              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0', avatarColor)}>
                                {student.first_name[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#1D1D1F] truncate">{fullName}</p>
                                {att === 'excused' && savedExcuse ? (
                                  <p className="text-xs text-indigo-500 truncate">
                                    Sababli: {savedExcuse.reason} · {new Date(savedExcuse.until).toLocaleDateString('uz-UZ')} gacha
                                  </p>
                                ) : (
                                  <p className="text-xs text-gray-400">{student.phone}</p>
                                )}
                              </div>
                              {/* Attendance buttons */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleAttendanceMark(student.id, 'present')}
                                  title="Keldi"
                                  className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-all', att === 'present' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600')}
                                >
                                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                </button>
                                <button
                                  onClick={() => handleAttendanceMark(student.id, 'late')}
                                  title="Kechikdi"
                                  className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-all', att === 'late' ? 'bg-amber-400 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600')}
                                >
                                  <Minus className="w-3.5 h-3.5" strokeWidth={3} />
                                </button>
                                <button
                                  onClick={() => handleAttendanceMark(student.id, 'absent')}
                                  title="Kelmadi"
                                  className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-all', att === 'absent' ? 'bg-rose-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-rose-100 hover:text-rose-600')}
                                >
                                  <XIcon className="w-3.5 h-3.5" strokeWidth={3} />
                                </button>
                                <button
                                  onClick={() => handleAttendanceMark(student.id, 'excused')}
                                  title={att === 'excused' ? 'Sababni olib tashlash' : 'Sababli'}
                                  className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-all', att === 'excused' ? 'bg-indigo-500 text-white shadow-sm' : isEditingExcused ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400 hover:bg-indigo-100 hover:text-indigo-500')}
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Excused inline form */}
                            {isEditingExcused && (
                              <div className="mx-6 mb-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Sababli davomat — {fullName}</p>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1">Sabab <span className="text-rose-400">*</span></label>
                                  <input
                                    autoFocus
                                    type="text"
                                    value={excusedReason}
                                    onChange={(e) => { setExcusedReason(e.target.value); setExcusedError(''); }}
                                    placeholder="Masalan: Kasallik, oilaviy vaziyat..."
                                    className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 transition-all"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1">Qaysi sanagacha? <span className="text-rose-400">*</span></label>
                                  <input
                                    type="date"
                                    value={excusedUntil}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => { setExcusedUntil(e.target.value); setExcusedError(''); }}
                                    className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 transition-all"
                                  />
                                </div>
                                {excusedError && <p className="text-xs text-rose-500">{excusedError}</p>}
                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={() => { setExcusedEditId(null); setExcusedError(''); }}
                                    className="flex-1 py-2 rounded-xl text-xs font-semibold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                                  >
                                    Bekor qilish
                                  </button>
                                  <button
                                    onClick={() => handleExcusedSubmit(student.id)}
                                    className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors shadow-sm shadow-indigo-200"
                                  >
                                    Saqlash
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ===== PAYMENTS TAB ===== */}
              {activeTab === 'payments' && (
                <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-50">
                    <h2 className="text-base font-bold text-[#1D1D1F]">To'lovlar tarixi</h2>
                  </div>
                  <div className="py-16 flex flex-col items-center justify-center text-center px-6">
                    <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-300 mb-4">
                      <CreditCard className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-[#1D1D1F] mb-1">To'lovlar yo'q</h3>
                    <p className="text-sm text-gray-400 max-w-xs">Bu guruh uchun hali to'lov kiritilmagan. Tezkor amallardan to'lov qo'shing.</p>
                  </div>
                </div>
              )}

              {/* ===== ATTENDANCE HISTORY ===== */}
              {activeTab === 'attendance' && (
                <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-50">
                    <h2 className="text-base font-bold text-[#1D1D1F]">Davomat tarixi</h2>
                  </div>
                  <div className="py-16 flex flex-col items-center justify-center text-center px-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-300 mb-4">
                      <CalendarDays className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-[#1D1D1F] mb-1">Davomat tarixi yo'q</h3>
                    <p className="text-sm text-gray-400 max-w-xs">Hali davomat belgilanmagan. O'quvchilar & Davomat bo'limidan boshlang.</p>
                  </div>
                </div>
              )}

              {/* ===== SETTINGS TAB ===== */}
              {activeTab === 'settings' && (
                <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-gray-400" />
                    <h2 className="text-base font-bold text-[#1D1D1F]">Sozlamalar</h2>
                  </div>
                  <form onSubmit={handleSaveSettings} className="p-6 space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Guruh nomi</label>
                      <input type="text" value={settingsName} onChange={(e) => setSettingsName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Oylik to'lov (so'm)</label>
                      <input type="number" value={settingsFee} onChange={(e) => setSettingsFee(e.target.value)} min={0} step={1000} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dars vaqti</label>
                      <input type="time" value={settingsTime} onChange={(e) => setSettingsTime(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all" />
                    </div>
                    <button
                      type="submit"
                      disabled={updateGroup.isPending}
                      className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all', settingsSaved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-[#3B82F6] hover:bg-blue-600 text-white shadow-sm shadow-blue-200')}
                    >
                      {settingsSaved ? <><Check className="w-4 h-4" /> Saqlandi</> : <><Save className="w-4 h-4" /> {updateGroup.isPending ? 'Saqlanmoqda...' : 'Saqlash'}</>}
                    </button>
                  </form>

                  <div className="mx-6 border-t border-gray-100" />
                  <div className="p-6 space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Guruh holati</p>
                    <button
                      onClick={() => setIsPaused((p) => !p)}
                      className={cn('w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all', isPaused ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100' : 'border-amber-200 bg-amber-50 hover:bg-amber-100')}
                    >
                      {isPaused ? (
                        <><PlayCircle className="w-5 h-5 text-emerald-500" /><div className="text-left"><p className="text-sm font-semibold text-emerald-700">Guruhni faollashtirish</p><p className="text-xs text-emerald-500">Guruh qayta faol holatga o'tadi</p></div></>
                      ) : (
                        <><PauseCircle className="w-5 h-5 text-amber-500" /><div className="text-left"><p className="text-sm font-semibold text-amber-700">Guruhni to'xtatish (pauza)</p><p className="text-xs text-amber-500">Vaqtinchalik to'xtatish, ma'lumotlar saqlanadi</p></div></>
                      )}
                    </button>
                    {!archiveConfirmOpen ? (
                      <button onClick={() => setArchiveConfirmOpen(true)} className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-rose-100 bg-rose-50 hover:bg-rose-100 transition-all">
                        <Archive className="w-5 h-5 text-rose-500" />
                        <div className="text-left"><p className="text-sm font-semibold text-rose-700">Guruhni arxivlash</p><p className="text-xs text-rose-400">Guruh arxivga o'tadi, keyinchalik tiklanishi mumkin</p></div>
                      </button>
                    ) : (
                      <div className="p-4 rounded-2xl border-2 border-rose-200 bg-rose-50 space-y-3">
                        <p className="text-sm font-semibold text-rose-700">Haqiqatan ham arxivlamoqchimisiz?</p>
                        <div className="flex gap-2">
                          <button onClick={() => setArchiveConfirmOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">Bekor qilish</button>
                          <button onClick={handleArchive} disabled={archiveGroup.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors disabled:opacity-60">{archiveGroup.isPending ? 'Jarayon...' : 'Ha, arxivlash'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ---- RIGHT SIDEBAR ---- */}
            <div className="lg:w-72 xl:w-80 space-y-4 shrink-0">
              <div className="rounded-3xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${groupColor}ee, ${groupColor})` }}>
                <p className="text-xs font-bold tracking-widest uppercase opacity-80 mb-3">DARS VAQTI</p>
                <div className="w-8 h-0.5 bg-white/40 rounded mb-4" />
                {group.lesson_days?.length ? (
                  <>
                    <div className="flex items-center gap-2 mb-2"><CalendarDays className="w-4 h-4 opacity-80" /><span className="text-sm font-semibold">{group.lesson_days.map((d) => DAY_SHORT[d] ?? d).join(', ')}</span></div>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 opacity-80" /><span className="text-sm font-semibold">{group.lesson_time}</span></div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 opacity-70"><CalendarDays className="w-4 h-4" /><span className="text-sm">Jadval belgilanmagan</span></div>
                )}
              </div>

              <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">TEZKOR AMALLAR</p>
                <div className="space-y-2">
                  <button
                    onClick={() => setQuickPaymentOpen(true)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left"><p className="text-sm font-semibold text-[#1D1D1F]">To'lov qo'shish</p><p className="text-xs text-gray-400">Yakka yoki guruh uchun</p></div>
                  </button>
                  <button
                    onClick={() => navigate('/messages')}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-100 hover:border-purple-200 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left"><p className="text-sm font-semibold text-[#1D1D1F]">Xabar yuborish</p><p className="text-xs text-gray-400">Eslatma yoki e'lon</p></div>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">GURUH MA'LUMOTLARI</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Dars kunlari</span><span className="font-semibold text-[#1D1D1F]">{group.lesson_days?.map((d) => DAY_SHORT[d] ?? d).join(', ') || '—'}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Dars vaqti</span><span className="font-semibold text-[#1D1D1F]">{group.lesson_time || '—'}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Oylik to'lov</span><span className="font-semibold text-[#1D1D1F]">{formatCurrency(group.monthly_fee)}</span></div>
                  {group.attendance_percent !== undefined && (
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Davomat</span><span className="font-semibold text-emerald-600">{group.attendance_percent}%</span></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ManageStudentsModal
        open={manageStudentsOpen}
        onClose={() => setManageStudentsOpen(false)}
        groupStudents={groupStudents}
        allStudents={allStudents}
        onAddStudents={handleAddStudents}
        onRemoveStudents={handleRemoveStudents}
      />

      {group && (
        <GroupQuickPaymentModal
          open={quickPaymentOpen}
          onClose={() => setQuickPaymentOpen(false)}
          group={group}
          students={groupStudents}
        />
      )}

      {group && (
        <DebtorsModal
          open={debtorsModalOpen}
          onClose={() => setDebtorsModalOpen(false)}
          group={group}
          debtors={debtorsList}
        />
      )}
    </div>
  );
}
