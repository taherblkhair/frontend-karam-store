import { Link } from 'react-router-dom';
import { resolveMediaUrl } from '@core/api/config.js';

/** Logo from admin settings + Arabic name; text only when no logo is set. */
export function BrandMark({ brand, size = 'md', inverted = false, className = '' }) {
  const logo = resolveMediaUrl(brand.logo);
  const img = size === 'lg' ? 'h-12 w-12' : 'h-9 w-9 md:h-10 md:w-10';
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 min-w-0 ${className}`} aria-label={`${brand.full} — الرئيسية`}>
      {logo ? (
        <img
          src={logo}
          alt=""
          width={40}
          height={40}
          className={`${img} shrink-0 rounded-full object-cover ring-1 ${inverted ? 'ring-white/20' : 'ring-ink-100'}`}
        />
      ) : null}
      <span className="min-w-0 leading-tight">
        <span className={`block font-display font-bold truncate ${size === 'lg' ? 'text-xl' : 'text-lg md:text-xl'} ${inverted ? 'text-white' : 'text-primary-600'}`}>
          {brand.ar}
        </span>
        <span className={`block text-[11px] tracking-[0.18em] uppercase ${inverted ? 'text-white/60' : 'text-ink-400'}`} dir="ltr">
          {brand.en}
        </span>
      </span>
    </Link>
  );
}

export default BrandMark;
