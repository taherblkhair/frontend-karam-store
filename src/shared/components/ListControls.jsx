import { Search, ChevronRight, ChevronLeft } from 'lucide-react';

export function SearchInput({ value, onChange, placeholder = 'بحث...', className = '' }) {
  return (
    <div className={`relative flex-1 sm:w-56 min-w-[180px] ${className}`}>
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
      <input
        className="input pr-9"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * Pagination controls — expects backend pagination meta:
 * { page, limit, total, pages }
 */
export function Pagination({ pagination, page, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;

  const current = page || pagination.page || 1;
  const totalPages = pagination.pages;
  const total = pagination.total;
  const limit = pagination.limit;

  const from = total === 0 ? 0 : (current - 1) * limit + 1;
  const to = Math.min(current * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-1">
      <p className="text-sm text-gray-500">
        عرض {from}–{to} من {total}
        {limit === 5 ? ' (نتائج البحث)' : ''}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-outline text-sm py-1 px-3 disabled:opacity-40"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          <ChevronRight size={16} /> السابق
        </button>
        <span className="text-sm font-medium min-w-[4rem] text-center">
          {current} / {totalPages}
        </span>
        <button
          type="button"
          className="btn-outline text-sm py-1 px-3 disabled:opacity-40"
          disabled={current >= totalPages}
          onClick={() => onPageChange(current + 1)}
        >
          التالي <ChevronLeft size={16} />
        </button>
      </div>
    </div>
  );
}
