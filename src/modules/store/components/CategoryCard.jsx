import { resolveMediaUrl } from '@core/api/config.js';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { OptimizedImage } from '@shared/components/OptimizedImage';

/**
 * Store category tile with image (fallback icon when missing).
 */
export function CategoryCard({ category, active = false, to }) {
  const href = to || `/products?category=${category.id}`;

  return (
    <Link
      to={href}
      className={`group overflow-hidden rounded-[1.4rem] border border-[#eee6e0] bg-white text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blush-300 hover:shadow-soft ${
        active ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-900' : ''
      }`}
    >
      <div className="aspect-square bg-blush-50 dark:bg-gray-700 overflow-hidden">
        {category.image ? (
          <OptimizedImage
            src={category.image}
            alt={category.name_ar}
            className="w-full h-full"
            imgClassName="group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 40vw, 160px"
            widths={[400, 800]}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-300">
            <Package size={36} />
          </div>
        )}
      </div>
      <div className="p-3.5">
        <h3 className="font-semibold text-sm text-ink-700 line-clamp-2">{category.name_ar}</h3>
      </div>
    </Link>
  );
}
