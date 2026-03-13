import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive, Users, User, Wallet, RotateCcw, Search,
  X, ChevronRight, Clock, AlertCircle,
} from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { useArchive, useRestoreArchive } from '../hooks/useArchive';
import type { Archive as ArchiveItem } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'group' | 'student' | 'payment';

// ── Meta ──────────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}> = {
  group: {
    label: 'Guruh',
    icon: <Users className="w-3.5 h-3.5" />,
    color: '#007AFF',
    bg: 'rgba(0,122,255,0.1)',
  },
  student: {
    label: "O'quvchi",
    icon: <User className="w-3.5 h-3.5" />,
    color: '#34C759',
    bg: 'rgba(52,199,89,0.1)',
  },
  payment: {
    label: "To'lov",
    icon: <Wallet className="w-3.5 h-3.5" />,
    color: '#FF9500',
    bg: 'rgba(255,149,0,0.1)',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getItemName(item: ArchiveItem): string {
  if (item.data.first_name && item.data.last_name) {
    return `${String(item.data.first_name)} ${String(item.data.last_name)}`;
  }
  if (item.data.name) return String(item.data.name);
  return `#${item.entity_id.slice(-6)}`;
}

function getItemSubtitle(item: ArchiveItem): string {
  if (item.entity_type === 'student' && item.data.phone) {
    return String(item.data.phone);
  }
  if (item.entity_type === 'group' && item.data.monthly_fee) {
    return `${Number(item.data.monthly_fee).toLocaleString()} so'm / oy`;
  }
  if (item.entity_type === 'payment' && item.data.amount) {
    return `${Number(item.data.amount).toLocaleString()} so'm · ${item.data.month_year ?? ''}`;
  }
  return '';
}

function formatArchivedDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getInitials(item: ArchiveItem): string {
  if (item.data.first_name && item.data.last_name) {
    return `${String(item.data.first_name)[0]}${String(item.data.last_name)[0]}`;
  }
  if (item.data.name) {
    const words = String(item.data.name).split(' ');
    return words.length >= 2
      ? `${words[0][0]}${words[1][0]}`
      : String(item.data.name).slice(0, 2).toUpperCase();
  }
  return item.entity_type[0].toUpperCase();
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ArchivePage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [restoreTarget, setRestoreTarget] = useState<ArchiveItem | null>(null);

  const { data: rawArchives = [], isLoading } = useArchive();
  const restoreMutation = useRestoreArchive();

  const archives = rawArchives;

  const filtered = useMemo(() => {
    let list = filter === 'all' ? archives : archives.filter((a) => a.entity_type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        getItemName(a).toLowerCase().includes(q) ||
        getItemSubtitle(a).toLowerCase().includes(q),
      );
    }
    return list;
  }, [archives, filter, search]);

  const counts = useMemo(() => ({
    all:     archives.length,
    group:   archives.filter((a) => a.entity_type === 'group').length,
    student: archives.filter((a) => a.entity_type === 'student').length,
    payment: archives.filter((a) => a.entity_type === 'payment').length,
  }), [archives]);

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      await restoreMutation.mutateAsync({
        type: restoreTarget.entity_type as 'group' | 'student' | 'payment',
        id: restoreTarget.entity_id,
      });
      setRestoreTarget(null);
    } catch {
      setRestoreTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Sidebar />
      <main className="md:pl-[280px] pb-24 md:pb-8">
        <Header />
        <div className="px-4 md:px-6 max-w-3xl mx-auto space-y-4 pt-2">

          {/* ── Title ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(142,142,147,0.12)' }}
            >
              <Archive className="w-5 h-5 text-[#8e8e93]" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-[#1c1c1e]">Arxiv</h1>
              <p className="text-[12px] text-[#8e8e93]">{archives.length} ta element</p>
            </div>
          </div>

          {/* ── Filter tabs ────────────────────────────────────────── */}
          <div
            className="flex bg-white rounded-2xl p-1 gap-1"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            {([
              { key: 'all' as const,     label: 'Barchasi' },
              { key: 'group' as const,   label: 'Guruhlar' },
              { key: 'student' as const, label: "O'quvchilar" },
              { key: 'payment' as const, label: "To'lovlar" },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition-all duration-200"
                style={filter === tab.key
                  ? { background: '#1c1c1e', color: '#fff' }
                  : { color: '#8e8e93' }
                }
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={filter === tab.key
                      ? { background: 'rgba(255,255,255,0.2)', color: '#fff' }
                      : { background: '#F5F5F7', color: '#8e8e93' }
                    }
                  >
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Search ─────────────────────────────────────────────── */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c7c7cc]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism yoki guruh bo'yicha qidirish..."
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

          {/* ── List ───────────────────────────────────────────────── */}
          {isLoading ? (
            <SkeletonList />
          ) : filtered.length === 0 ? (
            <EmptyState search={search} filter={filter} />
          ) : (
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.05)' }}
            >
              {filtered.map((item, idx) => {
                const meta = TYPE_META[item.entity_type] ?? TYPE_META.student;
                const hue = ((item.entity_id?.charCodeAt(4) ?? 0) * 53) % 360;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-[#F5F5F7] cursor-pointer"
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid #F5F5F7' : 'none',
                    }}
                    onClick={() => setRestoreTarget(item)}
                  >
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                      style={{ background: `hsl(${hue},45%,58%)` }}
                    >
                      {getInitials(item)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">
                          {getItemName(item)}
                        </p>
                        <span
                          className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                          style={{ color: meta.color, background: meta.bg }}
                        >
                          {meta.icon}
                          {meta.label}
                        </span>
                      </div>
                      {getItemSubtitle(item) && (
                        <p className="text-[12px] text-[#8e8e93] truncate mt-0.5">
                          {getItemSubtitle(item)}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-[#c7c7cc]" />
                        <p className="text-[11px] text-[#c7c7cc]">
                          {formatArchivedDate(item.archived_at)}
                        </p>
                      </div>
                    </div>

                    {/* Restore hint */}
                    <div className="shrink-0 flex items-center gap-1">
                      <span className="text-[12px] font-semibold text-[#007AFF] hidden sm:block">Tiklash</span>
                      <ChevronRight className="w-4 h-4 text-[#c7c7cc]" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Info note */}
          {!isLoading && archives.length > 0 && (
            <div
              className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
              style={{ background: 'rgba(142,142,147,0.08)' }}
            >
              <AlertCircle className="w-4 h-4 text-[#8e8e93] shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#8e8e93] leading-relaxed">
                Arxivdagi elementlar o'chirilmaydi. Istalgan vaqtda tiklash mumkin.
                Element ustiga bosib faol holatga qaytaring.
              </p>
            </div>
          )}

        </div>
      </main>

      {/* ── Restore confirm modal ───────────────────────────────── */}
      {restoreTarget && (
        <RestoreModal
          item={restoreTarget}
          loading={restoreMutation.isPending}
          onConfirm={handleRestore}
          onClose={() => setRestoreTarget(null)}
        />
      )}
    </div>
  );
}

// ── Restore Modal ─────────────────────────────────────────────────────────────

function RestoreModal({
  item,
  loading,
  onConfirm,
  onClose,
}: {
  item: ArchiveItem;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const meta = TYPE_META[item.entity_type] ?? TYPE_META.student;
  const hue = ((item.entity_id?.charCodeAt(4) ?? 0) * 53) % 360;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-sm bg-white sm:rounded-[28px] rounded-t-[28px] overflow-hidden"
        style={{
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.18)',
          animation: 'modalPop 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#e5e5ea]" />
        </div>

        <div className="px-6 pt-4 pb-6">
          {/* Avatar with restore badge */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[18px] font-bold"
                style={{ background: `hsl(${hue},45%,58%)` }}
              >
                {getInitials(item)}
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white"
                style={{ background: meta.color }}
              >
                <RotateCcw className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="text-center mb-4">
            <h2 className="text-[17px] font-bold text-[#1c1c1e] mb-1.5">
              {getItemName(item)}
            </h2>
            <p className="text-[13px] text-[#8e8e93] leading-relaxed">
              Bu element arxivdan chiqarib faol holatga qaytariladi.
              Davom etishni xohlaysizmi?
            </p>
          </div>

          {/* Type + date badge */}
          <div className="flex justify-center mb-5">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{ color: meta.color, background: meta.bg }}
            >
              {meta.icon}
              {meta.label}
              <span className="mx-0.5 text-[#c7c7cc]">·</span>
              <Clock className="w-3 h-3 text-[#c7c7cc]" />
              <span className="text-[#8e8e93] font-medium">{formatArchivedDate(item.archived_at)}</span>
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: loading
                  ? '#8e8e93'
                  : 'linear-gradient(135deg, #007AFF 0%, #34AADC 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0,122,255,0.35)',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Tiklanmoqda...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Ha, tiklash
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-[15px] font-semibold text-[#8e8e93] transition-all hover:bg-[#F5F5F7] active:scale-[0.98]"
            >
              Bekor qilish
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ search, filter }: { search: string; filter: FilterType }) {
  const msgs: Record<FilterType, { title: string; sub: string }> = {
    all:     { title: "Arxiv bo'sh",       sub: "Arxivlangan elementlar bu yerda ko'rinadi" },
    group:   { title: "Guruhlar yo'q",     sub: "Arxivlangan guruhlar topilmadi" },
    student: { title: "O'quvchilar yo'q",  sub: "Arxivlangan o'quvchilar topilmadi" },
    payment: { title: "To'lovlar yo'q",    sub: "Arxivlangan to'lovlar topilmadi" },
  };
  const msg = search
    ? { title: 'Topilmadi', sub: `"${search}" bo'yicha natija yo'q` }
    : msgs[filter];

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(142,142,147,0.1)' }}
      >
        <Archive className="w-7 h-7 text-[#c7c7cc]" />
      </div>
      <p className="text-[15px] font-semibold text-[#3c3c43]">{msg.title}</p>
      <p className="text-[13px] text-[#8e8e93] text-center max-w-xs">{msg.sub}</p>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: i < 4 ? '1px solid #F5F5F7' : 'none' }}
        >
          <div className="w-11 h-11 rounded-full bg-[#F5F5F7] animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-36 bg-[#F5F5F7] rounded-full animate-pulse" />
            <div className="h-3 w-24 bg-[#F5F5F7] rounded-full animate-pulse" />
            <div className="h-2.5 w-20 bg-[#F5F5F7] rounded-full animate-pulse" />
          </div>
          <div className="h-3 w-14 bg-[#F5F5F7] rounded-full animate-pulse shrink-0" />
        </div>
      ))}
    </div>
  );
}
