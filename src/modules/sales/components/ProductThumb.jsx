import { Package } from 'lucide-react';
import { OptimizedThumb } from '@shared/components/OptimizedImage';

export function ProductThumb({ src, alt, className = '' }) {
  if (src) {
    return <OptimizedThumb src={src} alt={alt || ''} className={className} />;
  }
  return (
    <div
      className={`flex items-center justify-center bg-tertiary-100 dark:bg-gray-700 text-ink-300 ${className}`}
    >
      <Package size={28} />
    </div>
  );
}
