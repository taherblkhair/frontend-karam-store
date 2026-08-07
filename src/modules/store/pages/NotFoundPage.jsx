import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowRight, SearchX } from 'lucide-react';
import StoreLayout from '@shared/layouts/StoreLayout';

/**
 * Generic 404 — unknown routes in the app.
 * @param {{ bare?: boolean }} props bare = no store chrome (used inside closed site)
 */
export default function NotFoundPage({ bare = false }) {
  const navigate = useNavigate();

  const body = (
    <div className="flex flex-col items-center justify-center text-center px-4 py-16 md:py-24">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30">
        <SearchX size={36} strokeWidth={1.75} />
      </div>
      <p className="text-sm font-bold tracking-wide text-primary-600 mb-2">404</p>
      <h1 className="text-2xl md:text-3xl font-display font-bold text-ink-800 dark:text-white mb-3">
        الصفحة غير موجودة
      </h1>
      <p className="max-w-md text-ink-500 dark:text-gray-400 leading-relaxed mb-8">
        عذراً، الرابط الذي فتحته غير صحيح أو أن الصفحة نُقلت. يمكنك العودة للرئيسية أو الرجوع للخلف.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link to="/" className="btn-primary min-w-[10rem]">
          <Home size={18} />
          الرئيسية
        </Link>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn-outline min-w-[10rem] inline-flex items-center justify-center gap-2"
        >
          <ArrowRight size={18} />
          رجوع
        </button>
      </div>
    </div>
  );

  if (bare) {
    return (
      <div className="min-h-[100dvh] bg-tertiary-100 dark:bg-gray-950 flex items-center justify-center">
        {body}
      </div>
    );
  }

  return <StoreLayout>{body}</StoreLayout>;
}
