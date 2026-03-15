interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, perPage, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4 px-4 py-3 border-t">
      <p className="text-sm text-gray-500">
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} / {total} ta
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
        >
          ← Oldingi
        </button>
        <span className="text-sm text-gray-600 px-2">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
        >
          Keyingi →
        </button>
      </div>
    </div>
  );
}
