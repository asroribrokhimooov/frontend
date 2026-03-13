import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, Users, GraduationCap, Wallet, Clock, Archive, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
import { useStudents } from '../../hooks/useStudents';
import { useGroups } from '../../hooks/useGroups';
import { usePayments } from '../../hooks/usePayments';
import { useReminders } from '../../hooks/useReminders';

interface HeaderProps {
  onMenuClick?: () => void;
}

// ─── Search result types ──────────────────────────────────────────────────────

type SearchCategory = 'students' | 'archive' | 'groups' | 'payments' | 'reminders';

interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  extra?: string;
  path: string;
}

const CATEGORY_META: Record<SearchCategory, { label: string; icon: React.ReactNode; color: string }> = {
  students:  { label: "O'quvchilar",  icon: <Users className="w-3.5 h-3.5" />,        color: '#007AFF' },
  archive:   { label: 'Arxiv',        icon: <Archive className="w-3.5 h-3.5" />,       color: '#8E8E93' },
  groups:    { label: 'Guruhlar',     icon: <GraduationCap className="w-3.5 h-3.5" />, color: '#34C759' },
  payments:  { label: "To'lovlar",    icon: <Wallet className="w-3.5 h-3.5" />,        color: '#FF9500' },
  reminders: { label: 'Eslatmalar',   icon: <Clock className="w-3.5 h-3.5" />,         color: '#FF3B30' },
};

const REMINDER_TYPE_LABELS: Record<string, string> = {
  promised_payment: "Va'da qilingan to'lov",
  debt_due: 'Qarz muddati',
};

// ─── Main header ──────────────────────────────────────────────────────────────

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const [query, setQuery]       = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const today = formatDate(new Date().toISOString(), 'EEEE, dd-MMMM');

  // Data sources
  const { data: students  = [] } = useStudents();
  const { data: groups    = [] } = useGroups();
  const { data: payments  = [] } = usePayments();
  const { data: reminders = [] } = useReminders();

  // ── Search logic ───────────────────────────────────────────────────────────
  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const out: SearchResult[] = [];

    // Students (active)
    students
      .filter((s) => !s.is_archived)
      .filter(
        (s) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          s.student_code.toLowerCase().includes(q) ||
          (s.phone ?? '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))
      )
      .slice(0, 4)
      .forEach((s) =>
        out.push({
          id: s.id,
          category: 'students',
          title: `${s.first_name} ${s.last_name}`,
          subtitle: `#${s.student_code}`,
          extra: s.phone ?? undefined,
          path: `/students/${s.id}`,
        })
      );

    // Archive (archived students)
    students
      .filter((s) => s.is_archived)
      .filter(
        (s) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          s.student_code.toLowerCase().includes(q)
      )
      .slice(0, 2)
      .forEach((s) =>
        out.push({
          id: `arch-${s.id}`,
          category: 'archive',
          title: `${s.first_name} ${s.last_name}`,
          subtitle: `#${s.student_code} · Arxivlangan`,
          path: `/archive`,
        })
      );

    // Groups
    groups
      .filter((g) => g.name.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((g) =>
        out.push({
          id: g.id,
          category: 'groups',
          title: g.name,
          subtitle: `${g.students_count ?? 0} o'quvchi · ${g.lesson_time}`,
          path: `/groups/${g.id}`,
        })
      );

    // Payments
    payments
      .filter(
        (p) =>
          (p.student?.first_name ?? '').toLowerCase().includes(q) ||
          (p.student?.last_name ?? '').toLowerCase().includes(q) ||
          String(p.amount).includes(q)
      )
      .slice(0, 3)
      .forEach((p) =>
        out.push({
          id: p.id,
          category: 'payments',
          title: `${p.student?.first_name ?? ''} ${p.student?.last_name ?? ''}`.trim(),
          subtitle: formatCurrency(p.amount),
          extra: p.group?.name,
          path: `/payments`,
        })
      );

    // Reminders
    reminders
      .filter(
        (r) =>
          r.status !== 'archived' &&
          (
            (r.student?.first_name ?? '').toLowerCase().includes(q) ||
            (r.student?.last_name ?? '').toLowerCase().includes(q)
          )
      )
      .slice(0, 3)
      .forEach((r) =>
        out.push({
          id: r.id,
          category: 'reminders',
          title: `${r.student?.first_name ?? ''} ${r.student?.last_name ?? ''}`.trim(),
          subtitle: REMINDER_TYPE_LABELS[r.type] ?? r.type,
          extra: r.due_date,
          path: `/reminders`,
        })
      );

    return out;
  }, [query, students, groups, payments, reminders]);

  // Group results by category
  const grouped = useMemo(() => {
    const map = new Map<SearchCategory, SearchResult[]>();
    results.forEach((r) => {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    });
    return map;
  }, [results]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current   && !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowResults(true);
      }
      if (e.key === 'Escape') {
        setShowResults(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setQuery('');
    setShowResults(false);
  };

  const handleClear = () => {
    setQuery('');
    setShowResults(false);
    inputRef.current?.focus();
  };

  const isOpen = showResults && query.trim().length >= 2;

  return (
    <header className="relative z-20 bg-transparent px-4 pt-4 pb-2 md:px-8 md:pt-6 md:pb-4">
      <div className="flex items-center justify-between gap-3 md:gap-4 h-14 w-full">

        {/* Mobile: hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm text-[#1F2937] hover:bg-gray-50 transition-colors shrink-0"
          aria-label="Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* ── Desktop search ─────────────────────────────────────────── */}
        <div className="flex-1 flex justify-center hidden md:flex">
          <div
            className="relative transition-all duration-300 ease-in-out"
            style={{ width: isFocused ? '520px' : '220px' }}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-colors" />
            <input
              ref={inputRef}
              type="search"
              placeholder={isFocused ? "O'quvchi, guruh, to'lov, eslatma..." : 'Qidirish...'}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
              onFocus={() => { setIsFocused(true); setShowResults(true); }}
              onBlur={() => setIsFocused(false)}
              className={cn(
                'w-full pl-10 pr-10 py-3 rounded-full bg-white transition-all duration-300 ease-in-out',
                isFocused
                  ? 'shadow-md border-[#3B82F6]/20 ring-4 ring-[#3B82F6]/10'
                  : 'shadow-sm border-transparent',
                'border text-sm text-[#1F2937] placeholder-gray-400 outline-none'
              )}
            />
            {query ? (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleClear(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            ) : (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-50 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-400">
                ⌘ K
              </div>
            )}

            {/* Results dropdown */}
            {isOpen && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl overflow-hidden"
                style={{
                  boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 16px 40px rgba(0,0,0,0.14)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  maxHeight: '480px',
                  overflowY: 'auto',
                }}
              >
                {results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Search className="w-8 h-8 text-gray-200 mb-2" />
                    <p className="text-[13px] text-gray-400">Natija topilmadi</p>
                  </div>
                ) : (
                  Array.from(grouped.entries()).map(([category, items]) => {
                    const meta = CATEGORY_META[category];
                    return (
                      <div key={category}>
                        {/* Category header */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/70 border-b border-gray-100/80">
                          <span style={{ color: meta.color }}>{meta.icon}</span>
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            {meta.label}
                          </span>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ color: meta.color, background: `${meta.color}15` }}
                          >
                            {items.length}
                          </span>
                        </div>
                        {/* Items */}
                        {items.map((result, idx) => (
                          <button
                            key={result.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(result); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F5F8FF] transition-colors text-left"
                            style={{ borderBottom: idx < items.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                              style={{ background: meta.color }}
                            >
                              {result.title.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-[#1c1c1e] truncate">
                                {result.title}
                              </p>
                              <p className="text-[11px] text-[#8e8e93] truncate">
                                {result.subtitle}
                                {result.extra && ` · ${result.extra}`}
                              </p>
                            </div>
                            <span className="text-[10px] text-gray-300 shrink-0">→</span>
                          </button>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile search ──────────────────────────────────────────── */}
        <div className="flex-1 md:hidden">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              placeholder="Qidirish..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cn(
                'w-full pl-11 pr-4 py-3 rounded-full bg-white shadow-sm',
                'border border-transparent focus:border-[#3B82F6]/20 focus:ring-4 focus:ring-[#3B82F6]/10',
                'text-[#1F2937] placeholder-gray-400 outline-none transition-all duration-300'
              )}
            />
          </div>
        </div>

        {/* Right: date + notification */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <div className="hidden sm:flex items-center justify-center px-4 h-12 rounded-full bg-white shadow-sm border border-transparent">
            <span className="text-sm text-[#1F2937] font-medium capitalize">
              {today}
            </span>
          </div>
          <button
            type="button"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm border border-transparent text-gray-600 hover:text-[#3B82F6] hover:bg-gray-50 transition-all duration-200 relative group"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 group-hover:animate-[wiggle_1s_ease-in-out_infinite]" />
            <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
          </button>
        </div>
      </div>
    </header>
  );
}
