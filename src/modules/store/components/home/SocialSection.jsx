import { Instagram } from 'lucide-react';
import { SocialMediaLinks, normalizeUrl } from '@modules/store/components/SocialMediaLinks';

/** "@handle" from an Instagram profile URL (null when it can't be read). */
function instagramHandle(url) {
  const m = String(url || '').match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  return m ? `@${m[1]}` : null;
}

/** Follow-us block built from the social links in settings — hidden when none is set. No made-up photos. */
export function SocialSection({ brand, settings = {} }) {
  const instagram = normalizeUrl(settings.social_instagram);
  const others = { ...settings, social_instagram: '' };
  const hasOthers = ['social_facebook', 'social_telegram', 'social_snapchat', 'social_tiktok'].some((k) => String(settings[k] || '').trim());
  if (!instagram && !hasOthers) return null;
  const handle = instagramHandle(instagram);

  return (
    <section aria-labelledby="social-title" className="container mx-auto px-4 py-12 sm:py-14">
      <div className="rounded-3xl bg-gradient-to-l from-primary-700 to-primary-900 px-6 py-10 sm:px-12 text-center text-white">
        <h2 id="social-title" className="font-display text-xl sm:text-2xl md:text-[1.65rem] font-bold text-white">تابع {brand.ar}</h2>
        <p className="mt-2 text-sm sm:text-base text-white/80">أحدث الموديلات والعروض تصلك أولاً على حساباتنا.</p>
        {instagram ? (
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-primary-700 transition hover:bg-secondary-400 hover:text-ink-800"
          >
            <Instagram size={20} aria-hidden />
            تابعنا على Instagram
            {handle ? <span dir="ltr" className="font-normal opacity-80">{handle}</span> : null}
          </a>
        ) : null}
        {hasOthers ? <SocialMediaLinks settings={others} className="mt-5 justify-center" iconClassName="w-10 h-10" /> : null}
      </div>
    </section>
  );
}

export default SocialSection;
