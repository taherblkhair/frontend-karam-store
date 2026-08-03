import { resolveMediaUrl } from '@core/api/config.js';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

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
      <div className="aspect-square bg-gray-50 dark:bg-gray-700 overflow-hidden">
        {category.image ? (
          <img
            src={resolveMediaUrl(category.image)}
            alt={category.name_ar}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
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
