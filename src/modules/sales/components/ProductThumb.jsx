import { Package } from 'lucide-react';

export function ProductThumb({ src, alt, className = '' }) {
  if (src) {
    return <img src={src} alt={alt} className={`object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400 ${className}`}>
      <Package size={28} />
    </div>
  );
}
