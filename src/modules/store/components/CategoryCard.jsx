import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { OptimizedImage } from '@shared/components/OptimizedImage';

/**
 * Store category tile: real category image, name below, links to the filtered products page.
 */
export function CategoryCard({ category, active = false, to, className = '' }) {
  const href = to || `/products?category=${category.id}`;

  return (
    <Link to={href} className={`group block text-center ${className}`}>
      <div
        className={`aspect-[4/5] overflow-hidden rounded-2xl bg-tertiary-200 ring-1 ring-black/[0.04] transition group-hover:shadow-md dark:bg-gray-700 ${
          active ? 'ring-2 ring-primary-500' : ''
        }`}
      >
        {category.image ? (
          <OptimizedImage
            src={category.image}
            alt=""
            className="w-full h-full"
            imgClassName="transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 38vw, (max-width: 1024px) 22vw, 200px"
            widths={[400, 800]}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-300">
            <Package size={36} aria-hidden />
          </div>
        )}
      </div>
      <h3 className="mt-2.5 font-semibold text-sm sm:text-base text-ink-800 line-clamp-1 group-hover:text-primary-600 dark:text-gray-100">
        {category.name_ar}
      </h3>
    </Link>
  );
}
