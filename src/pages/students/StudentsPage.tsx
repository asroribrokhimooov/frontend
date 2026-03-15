import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Search, FileText, FileSpreadsheet,
  ChevronLeft, ChevronRight, Users,
} from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StudentFormModal } from './StudentFormModal';
import { useStudents, useCreateStudent, useAddStudentToGroup } from '../../hooks/useStudents';
import { useDebtors } from '../../hooks/usePayments';
import { api } from '../../api/axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { utils, writeFile } from 'xlsx';
import { safeArray } from '../../utils/safeArray';
import type { Student, StudentCreatePayload, Payment } from '../../types';

const PAGE_SIZE = 30;

type FilterKey = 'all' | 'debtors' | 'paid' | 'nogroup';

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-green-100 text-green-600',
  'bg-purple-100 text-purple-600',
  'bg-amber-100 text-amber-600',
  'bg-pink-100 text-pink-600',
  'bg-teal-100 text-teal-600',
  'bg-indigo-100 text-indigo-600',
  'bg-rose-100 text-rose-600',
];

function getInitials(s: Student): string {
  const f = (s.first_name ?? '').trim()[0] ?? '';
  const l = (s.last_name ?? '').trim()[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

function getAvatarColor(name: string): string {
  let code = 0;
  for (let i = 0; i < name.length; i++) code += name.charCodeAt(i);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function StudentPaymentBadge({ studentId }: { studentId: string }) {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', 'student', studentId],
    queryFn: async (): Promise<Payment[]> => {
      const res = await api.get<Payment[] | { data: Payment[] }>('/payments', {
        params: { student_id: studentId },
      });
      return safeArray<Payment>(res.data);
    },
    staleTime: 30_000,
    retry: 1,
  });

  if (isLoading) return <div className="w-16 h-5 bg-gray-100 rounded-full animate-pulse" />;
  if (!payments?.length) return <Badge variant="neutral" size="sm">Noma'lum</Badge>;

  const latest = [...payments].sort(
    (a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime()
  )[0];

  if (latest.status === 'paid' || latest.status === 'prepaid')
    return <Badge variant="success" size="sm">To'lagan</Badge>;
  if (latest.status === 'partial')
    return <Badge variant="warning" size="sm">Qisman</Badge>;
  if (latest.status === 'promised')
    return <Badge size="sm" className="bg-orange-100 text-orange-700 border-orange-200">Va'da</Badge>;
  return <Badge variant="neutral" size="sm">Noma'lum</Badge>;
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',     label: 'Hammasi'   },
  { key: 'debtors', label: 'Qarzdorlar' },
  { key: 'paid',    label: "To'lagan"  },
  { key: 'nogroup', label: 'Guruhsiz'  },
];

export function StudentsPage() {
  const navigate = useNavigate();
  const [filter, setFilter]     = useState<FilterKey>('all');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  const { data: students = [], isLoading, isError } = useStudents();
  const { data: debtors = [] } = useDebtors();
  const createStudent = useCreateStudent();
  const addToGroup    = useAddStudentToGroup(undefined);

  const debtorIds = useMemo(() => new Set(debtors.map((d) => d.student_id)), [debtors]);

  const filtered = useMemo(() => {
    let list = students;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((s) =>
      (s.first_name ?? '').toLowerCase().includes(q) ||
      (s.last_name ?? '').toLowerCase().includes(q)
    );
    if (filter === 'debtors') list = list.filter((s) => debtorIds.has(s.id));
    else if (filter === 'paid') list = list.filter((s) => !!s.groups?.length && !debtorIds.has(s.id));
    else if (filter === 'nogroup') list = list.filter((s) => !s.groups?.length);
    return list;
  }, [students, search, filter, debtorIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch     = (val: string) => { setSearch(val); setPage(1); };
  const handleFilter     = (key: FilterKey) => { setFilter(key); setPage(1); };
  const handlePageChange = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleSubmitForm = (payload: StudentCreatePayload, groupId: string | null) => {
    createStudent.mutate(payload, {
      onSuccess: (created) => {
        if (created?.id && groupId) {
          addToGroup.mutate({ studentId: created.id, groupId }, { onSuccess: () => setFormOpen(false) });
        } else {
          setFormOpen(false);
        }
      },
    });
  };

  const exportStatus = (s: Student): string => {
    if (!s.groups?.length)   return 'Guruhsiz';
    if (debtorIds.has(s.id)) return 'Qarzdor';
    return "To'lagan";
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text("TeachFlow — O'quvchilar ro'yxati", 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 14, 23);
    autoTable(doc, {
      head: [['№', 'Ism Familiya', 'Telefon', 'Guruh', "To'lov holati"]],
      body: filtered.map((s, i) => [
        String(i + 1),
        `${s.first_name} ${s.last_name}`,
        s.phone || '—',
        s.groups?.map((g) => g.name).join(', ') || 'Guruhsiz',
        exportStatus(s),
      ]),
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 9, font: 'helvetica', cellPadding: 4 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 255] },
    });
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180);
      doc.text('TeachFlow', doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' });
    }
    doc.save(`students-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportExcel = () => {
    const rows = filtered.map((s, i) => ({
      '№': i + 1,
      Ism: s.first_name,
      Familiya: s.last_name,
      Telefon: s.phone || '',
      'Ota-ona tel': s.parent_phone || '',
      Guruh: s.groups?.map((g) => g.name).join(', ') || 'Guruhsiz',
      "To'lov holati": exportStatus(s),
    }));
    const ws = utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "O'quvchilar");
    writeFile(wb, `students-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (page > 3) pages.push('...');
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] via-[#F0F4FA] to-[#EEF2FF]">
      <Sidebar />
      <main className="md:pl-[280px] pb-20 md:pb-0">
        <Header />
        <div className="p-4 md:p-6 max-w-5xl mx-auto">

          {/* ── Page header ──────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-[#1F2937] tracking-tight">O'quvchilar</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {isLoading ? '...' : `${students.length} ta o'quvchi`}
              </p>
            </div>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setFormOpen(true)}
              className="shadow-[0_2px_12px_rgba(59,130,246,0.3)]"
            >
              O'quvchi qo'shish
            </Button>
          </div>

          {/* ── Search + Export ───────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Ism yoki familiya bo'yicha qidirish..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/80 bg-white/80 backdrop-blur-sm shadow-[0_1px_8px_rgba(0,0,0,0.06)] focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none text-[#1F2937] text-sm transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={exportPDF}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-[0_1px_8px_rgba(0,0,0,0.05)] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
              <button
                type="button"
                onClick={exportExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-[0_1px_8px_rgba(0,0,0,0.05)] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>

          {/* ── Filters ───────────────────────────────────────────────────── */}
          <div className="flex gap-2 flex-wrap mb-5">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleFilter(key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === key
                    ? 'bg-blue-600 text-white shadow-[0_2px_10px_rgba(59,130,246,0.35)]'
                    : 'bg-white/80 text-gray-500 border border-gray-200 hover:border-gray-300 shadow-[0_1px_4px_rgba(0,0,0,0.05)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {isError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-sm text-red-600">Ma'lumot yuklanmadi, qayta urinib ko'ring</p>
            </div>
          )}

          {/* ── List ──────────────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] p-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-base font-semibold text-[#1F2937] mb-1">O'quvchilar topilmadi</p>
              <p className="text-sm text-gray-400 mb-5">Yangi o'quvchi qo'shish uchun tugmani bosing</p>
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setFormOpen(true)}>
                O'quvchi qo'shish
              </Button>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden border border-white">
              <div className="divide-y divide-gray-100/80">
                {paginated.map((student, idx) => {
                  const initials    = getInitials(student);
                  const avatarColor = getAvatarColor(student.first_name + student.last_name);
                  const groupName   = student.groups?.length
                    ? student.groups.map((g) => g.name).join(', ')
                    : null;

                  return (
                    <div
                      key={student.id}
                      onClick={() => navigate(`/student-profile/${student.id}`)}
                      className="group flex items-center gap-3.5 px-5 py-3.5 hover:bg-blue-50/40 active:bg-blue-50/60 transition-all cursor-pointer"
                    >
                      {/* Index */}
                      <span className="text-xs text-gray-300 font-medium w-5 shrink-0 tabular-nums">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </span>

                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${avatarColor}`}>
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1F2937] truncate text-sm group-hover:text-blue-700 transition-colors">
                          {student.first_name} {student.last_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
                          <span className="text-xs text-gray-400 font-mono">
                            #{String(student.student_code ?? '').slice(-6)}
                          </span>
                          {student.phone && (
                            <span className="text-xs text-gray-400">{student.phone}</span>
                          )}
                          {groupName ? (
                            <span className="text-xs text-blue-400 truncate">{groupName}</span>
                          ) : (
                            <span className="text-xs text-gray-300">Guruhsiz</span>
                          )}
                        </div>
                      </div>

                      {/* Payment badge */}
                      <div className="shrink-0">
                        <StudentPaymentBadge studentId={student.id} />
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {(totalPages > 1 || filtered.length > 0) && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-xs text-gray-400 order-2 sm:order-1">
                    Jami <span className="font-semibold text-[#1F2937]">{filtered.length}</span> ta ·{' '}
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} ko'rsatilmoqda
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1 order-1 sm:order-2">
                      <button
                        type="button"
                        disabled={page === 1}
                        onClick={() => handlePageChange(page - 1)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      {getPageNumbers().map((p, i) =>
                        p === '...' ? (
                          <span key={`dot-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handlePageChange(p)}
                            className={`w-8 h-8 text-sm rounded-lg transition-all ${
                              page === p
                                ? 'bg-blue-600 text-white font-semibold shadow-[0_2px_8px_rgba(59,130,246,0.35)]'
                                : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}
                      <button
                        type="button"
                        disabled={page === totalPages}
                        onClick={() => handlePageChange(page + 1)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <StudentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitForm}
        loading={createStudent.isPending || addToGroup.isPending}
      />
    </div>
  );
}
