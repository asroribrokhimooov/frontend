import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

function getPageNumbers(page: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (page > 3) pages.push('...');
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
  if (page < totalPages - 2) pages.push('...');
  pages.push(totalPages);
  return pages;
}

export function Pagination({ page, totalPages, total, perPage, onChange }: PaginationProps) {
  if (totalPages <= 1 && total <= perPage) return null;

  const handleChange = (p: number) => {
    onChange(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
      <p className="text-xs text-gray-400 order-2 sm:order-1">
        Jami <span className="font-semibold text-[#1F2937]">{total}</span> ta ·{' '}
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} ko'rsatilmoqda
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1 order-1 sm:order-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => handleChange(page - 1)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`dot-${i}`} className="px-1 text-gray-400 text-sm">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => handleChange(p)}
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
            onClick={() => handleChange(page + 1)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
