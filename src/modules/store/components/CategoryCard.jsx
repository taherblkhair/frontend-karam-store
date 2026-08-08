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
      className={`group card overflow-hidden text-center transition hover:shadow-md hover:border-primary-300 ${
        active ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-900' : ''
      }`}
    >
      <div className="aspect-square bg-tertiary-100 dark:bg-gray-700 overflow-hidden">
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
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2">{category.name_ar}</h3>
      </div>
    </Link>
  );
}
