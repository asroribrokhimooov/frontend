import { useState, useMemo } from 'react';
import {
  Archive, Users, User, Wallet, RotateCcw, Search,
  X, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { useArchive, useRestoreArchive } from '../hooks/useArchive';
import type { Archive as ArchiveItem } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

type TabKey = 'all' | 'group' | 'student' | 'payment';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Hammasi' },
  { key: 'group', label: 'Guruhlar' },
  { key: 'student', label: "O'quvchilar" },
  { key: 'payment', label: "To'lovlar" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function searchItem(item: ArchiveItem, q: string): boolean {
  const s = q.toLowerCase();
  const d = item.data;

  if (item.entity_type === 'group') {
    return String(d.name ?? '').toLowerCase().includes(s);
  }
  if (item.entity_type === 'student') {
    const fullName = `${d.first_name ?? ''} ${d.last_name ?? ''}`.toLowerCase();
    return fullName.includes(s) || String(d.student_code ?? '').includes(q);
  }
  if (item.entity_type === 'payment') {
    return (
      String(d.student_name ?? '').toLowerCase().includes(s) ||
      String(d.group_name ?? '').toLowerCase().includes(s)
    );
  }
  return false;
}

// ── Main page ────────────────────────────────────────────────────────────────

export function ArchivePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');

  const { data: rawArchives, isLoading } = useArchive();
  const restoreMutation = useRestoreArchive();

  const archives = Array.isArray(rawArchives) ? rawArchives : [];

  const filtered = useMemo(() => {
    let list = archives;
    if (activeTab !== 'all') {
      list = list.filter((a) => a.entity_type === activeTab);
    }
    if (search.trim()) {
      list = list.filter((a) => searchItem(a, search.trim()));
    }
    return list;
  }, [archives, activeTab, search]);

  const handleRestore = (item: ArchiveItem) => {
    const typeNames: Record<string, string> = {
      group: 'guruh',
      student: "o'quvchi",
      payment: "to'lov",
    };

    if (
      window.confirm(
        `Bu ${typeNames[item.entity_type]}ni qayta tiklashni tasdiqlaysizmi?`,
      )
    ) {
      restoreMutation.mutate(
        { type: item.entity_type, id: item.entity_id },
        {
          onSuccess: () => toast.success('Muvaffaqiyatli tiklandi ✓'),
          onError: () => toast.error('Xatolik yuz berdi'),
        },
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Sidebar />
      <main className="md:pl-[280px] pb-24 md:pb-8">
        <Header />
        <div className="px-4 md:px-6 max-w-4xl mx-auto space-y-4 pt-2">

          {/* ── Title + count ───────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-[#1c1c1e]">Arxiv</h1>
              <p className="text-[13px] text-[#8e8e93]">
                Arxivlangan ma'lumotlar bu yerda saqlanadi
              </p>
            </div>
            <span
              className="text-[12px] font-bold px-3 py-1.5 rounded-full bg-[#1c1c1e] text-white"
            >
              {archives.length}
            </span>
          </div>

          {/* ── Search ──────────────────────────────────────────── */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c7c7cc]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Qidirish..."
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white text-[14px] text-[#1c1c1e] border-none outline-none placeholder:text-[#c7c7cc]"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#c7c7cc] flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>

          {/* ── Filter tabs ─────────────────────────────────────── */}
          <div
            className="flex bg-white rounded-2xl p-1 gap-1"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200"
                style={
                  activeTab === tab.key
                    ? { background: '#1c1c1e', color: '#fff' }
                    : { color: '#8e8e93' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Content ─────────────────────────────────────────── */}
          {isLoading ? (
            <SkeletonCards />
          ) : filtered.length === 0 ? (
            <EmptyState search={search} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((item) => (
                <ArchiveCard
                  key={item.id}
                  item={item}
                  onRestore={() => handleRestore(item)}
                  restoring={
                    restoreMutation.isPending &&
                    restoreMutation.variables?.id === item.entity_id
                  }
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Archive Card ─────────────────────────────────────────────────────────────

function ArchiveCard({
  item,
  onRestore,
  restoring,
}: {
  item: ArchiveItem;
  onRestore: () => void;
  restoring: boolean;
}) {
  const d = item.data;

  if (item.entity_type === 'group') {
    const color = String(d.color ?? '#3B82F6');
    return (
      <div
        className="bg-white rounded-2xl p-4 space-y-2"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full"
              style={{ background: color }}
            />
            <span className="text-[10px] font-bold text-[#007AFF] bg-[rgba(0,122,255,0.1)] px-2 py-0.5 rounded-lg flex items-center gap-1">
              <Users className="w-3 h-3" /> GURUH
            </span>
          </div>
        </div>
        <p className="text-[15px] font-bold text-[#1c1c1e] truncate">
          {String(d.name ?? '')}
        </p>
        {Boolean(d.lesson_days || d.lesson_time) && (
          <p className="text-[12px] text-[#8e8e93]">
            {Array.isArray(d.lesson_days)
              ? (d.lesson_days as string[]).join(', ')
              : String(d.lesson_days ?? '')}
            {d.lesson_time ? ` • ${String(d.lesson_time)}` : ''}
          </p>
        )}
        {Boolean(d.monthly_fee) && (
          <p className="text-[13px] font-semibold text-[#1c1c1e]">
            {Number(d.monthly_fee).toLocaleString()} so'm/oy
          </p>
        )}
        <div className="flex items-center gap-1 text-[11px] text-[#c7c7cc]">
          <Clock className="w-3 h-3" />
          Arxivlangan: {formatDate(item.archived_at)}
        </div>
        <div className="flex justify-end pt-1">
          <button
            onClick={onRestore}
            disabled={restoring}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#007AFF] hover:text-[#005EC4] transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tiklash
          </button>
        </div>
      </div>
    );
  }

  if (item.entity_type === 'student') {
    const name = `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim();
    const initials =
      d.first_name && d.last_name
        ? `${String(d.first_name)[0]}${String(d.last_name)[0]}`
        : name.slice(0, 2).toUpperCase();
    const hue = ((item.entity_id?.charCodeAt(4) ?? 0) * 53) % 360;

    return (
      <div
        className="bg-white rounded-2xl p-4 space-y-2"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
              style={{ background: `hsl(${hue},45%,58%)` }}
            >
              {initials}
            </div>
            <span className="text-[10px] font-bold text-[#34C759] bg-[rgba(52,199,89,0.1)] px-2 py-0.5 rounded-lg flex items-center gap-1">
              <User className="w-3 h-3" /> O'QUVCHI
            </span>
          </div>
        </div>
        <p className="text-[15px] font-bold text-[#1c1c1e] truncate">
          {name || `#${item.entity_id.slice(-6)}`}
        </p>
        {Boolean(d.student_code) && (
          <p className="text-[12px] text-[#8e8e93]">
            ID: {String(d.student_code)}
          </p>
        )}
        <p className="text-[12px] text-[#8e8e93]">
          Tel: {d.phone ? String(d.phone) : '—'}
        </p>
        <div className="flex items-center gap-1 text-[11px] text-[#c7c7cc]">
          <Clock className="w-3 h-3" />
          Arxivlangan: {formatDate(item.archived_at)}
        </div>
        <div className="flex justify-end pt-1">
          <button
            onClick={onRestore}
            disabled={restoring}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#007AFF] hover:text-[#005EC4] transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tiklash
          </button>
        </div>
      </div>
    );
  }

  // payment
  return (
    <div
      className="bg-white rounded-2xl p-4 space-y-2"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#FF9500] bg-[rgba(255,149,0,0.1)] px-2 py-0.5 rounded-lg flex items-center gap-1">
          <Wallet className="w-3 h-3" /> TO'LOV
        </span>
        {Boolean(d.status) && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
            style={{
              color:
                d.status === 'paid'
                  ? '#34C759'
                  : d.status === 'pending'
                    ? '#FF9500'
                    : '#EF4444',
              background:
                d.status === 'paid'
                  ? 'rgba(52,199,89,0.1)'
                  : d.status === 'pending'
                    ? 'rgba(255,149,0,0.1)'
                    : 'rgba(239,68,68,0.1)',
            }}
          >
            {String(d.status)}
          </span>
        )}
      </div>
      <p className="text-[15px] font-bold text-[#1c1c1e] truncate">
        {String(d.student_name ?? '')}
      </p>
      {Boolean(d.group_name) && (
        <p className="text-[12px] text-[#8e8e93]">
          Guruh: {String(d.group_name)}
        </p>
      )}
      <p className="text-[13px] font-semibold text-[#1c1c1e]">
        {d.amount ? `${Number(d.amount).toLocaleString()} so'm` : ''}
        {d.month_year ? ` • ${String(d.month_year)}` : ''}
      </p>
      <div className="flex items-center gap-1 text-[11px] text-[#c7c7cc]">
        <Clock className="w-3 h-3" />
        Arxivlangan: {formatDate(item.archived_at)}
      </div>
      <div className="flex justify-end pt-1">
        <button
          onClick={onRestore}
          disabled={restoring}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-[#007AFF] hover:text-[#005EC4] transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Tiklash
        </button>
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(142,142,147,0.1)' }}
      >
        <Archive className="w-7 h-7 text-[#c7c7cc]" />
      </div>
      {search ? (
        <p className="text-[13px] text-[#8e8e93] text-center">
          '{search}' bo'yicha natija topilmadi
        </p>
      ) : (
        <>
          <p className="text-[15px] font-semibold text-[#3c3c43]">Arxiv bo'sh</p>
          <p className="text-[13px] text-[#8e8e93] text-center max-w-xs">
            Arxivlangan ma'lumotlar bu yerda saqlanadi
          </p>
        </>
      )}
    </div>
  );
}

// ── Skeleton cards ───────────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-4 space-y-3"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#F5F5F7] animate-pulse" />
            <div className="h-4 w-16 bg-[#F5F5F7] rounded-lg animate-pulse" />
          </div>
          <div className="h-4 w-32 bg-[#F5F5F7] rounded-full animate-pulse" />
          <div className="h-3 w-24 bg-[#F5F5F7] rounded-full animate-pulse" />
          <div className="h-3 w-20 bg-[#F5F5F7] rounded-full animate-pulse" />
        </div>
      ))}
    </div>
  );
}
