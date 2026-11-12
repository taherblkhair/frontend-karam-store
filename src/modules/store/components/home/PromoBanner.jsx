import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { buildResponsiveMedia } from '@core/api/config.js';

function PromoTile({ banner, wide }) {
  const href = banner.link?.trim() || '/products';
  const external = /^https?:\/\//i.test(href);
  const media = buildResponsiveMedia(banner.image, { widths: [800, 1200] });
  const hasText = Boolean(banner.title_ar || banner.subtitle_ar);
  const body = (
    <>
      <img
        src={media.src}
        srcSet={media.srcSet || undefined}
        sizes={wide ? '100vw' : '(max-width: 768px) 100vw, 50vw'}
        alt={hasText ? '' : banner.title_ar || 'عرض ترويجي'}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
      />
      {hasText ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent sm:bg-gradient-to-l sm:from-black/60 sm:via-black/20" />
          <div className="relative z-10 flex h-full items-end sm:items-center p-5 sm:p-10">
            <div className="max-w-lg text-white space-y-2 sm:space-y-3">
              {banner.title_ar ? <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-white">{banner.title_ar}</h2> : null}
              {banner.subtitle_ar ? <p className="text-sm sm:text-base text-white/85 line-clamp-2">{banner.subtitle_ar}</p> : null}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary-700">
                اكتشف المزيد <ArrowLeft size={16} aria-hidden />
              </span>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
  const className = `group relative block overflow-hidden rounded-3xl bg-tertiary-200 ${wide ? 'aspect-[4/3] sm:aspect-[21/8]' : 'aspect-[4/3] sm:aspect-[16/9]'}`;
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{body}</a>
  ) : (
    <Link to={href} className={className}>{body}</Link>
  );
}

/** Mid-page promotional banner(s) managed in admin → Banners (placement "وسط الصفحة"). */
export function PromoBanner({ banners = [] }) {
  const list = banners.filter((b) => b?.image).slice(0, 2);
  if (!list.length) return null;
  return (
    <section aria-label="عروض ترويجية" className="container mx-auto px-4 py-6 sm:py-8">
      <div className={`grid gap-4 ${list.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {list.map((b) => (
          <PromoTile key={b.id} banner={b} wide={list.length === 1} />
        ))}
      </div>
    </section>
  );
}

export default PromoBanner;
