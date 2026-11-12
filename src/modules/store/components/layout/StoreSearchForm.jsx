import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';

/**
 * Product search → /products?search=… (the products page already filters by `search`).
 * Keeps the current term when the visitor is on the results page.
 */
export function StoreSearchForm({ autoFocus = false, onDone, className = '', inputId = 'store-search' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname === '/products' ? new URLSearchParams(location.search).get('search') || '' : '';
  const [term, setTerm] = useState(current);
  const inputRef = useRef(null);

  useEffect(() => setTerm(current), [current]);
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const submit = (e) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
    inputRef.current?.blur();
    onDone?.();
  };

  return (
    <form role="search" onSubmit={submit} className={`relative ${className}`}>
      <label htmlFor={inputId} className="sr-only">ابحث عن منتج</label>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        enterKeyHint="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="ابحث عن حقيبة، حذاء، براند…"
        className="input h-11 rounded-full bg-tertiary-100 border-transparent pr-11 pl-10 focus:bg-white dark:bg-gray-800"
      />
      <button
        type="submit"
        aria-label="بحث"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:text-primary-600"
      >
        <Search size={18} />
      </button>
      {term ? (
        <button
          type="button"
          aria-label="مسح البحث"
          onClick={() => {
            setTerm('');
            inputRef.current?.focus();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-ink-400 hover:bg-tertiary-200 hover:text-ink-700 dark:hover:bg-gray-700"
        >
          <X size={16} />
        </button>
      ) : null}
    </form>
  );
}

export default StoreSearchForm;
