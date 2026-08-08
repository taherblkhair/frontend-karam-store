import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Instagram, Facebook, Send } from 'lucide-react';
import { storeApi } from '@modules/store/api/store.api';

const SOCIAL_DEFS = [
  {
    key: 'social_instagram',
    label: 'Instagram',
    Icon: Instagram,
  },
  {
    key: 'social_facebook',
    label: 'Facebook',
    Icon: Facebook,
  },
  {
    key: 'social_telegram',
    label: 'Telegram',
    Icon: Send,
  },
  {
    key: 'social_snapchat',
    label: 'Snapchat',
    Icon: SnapchatIcon,
  },
  {
    key: 'social_tiktok',
    label: 'TikTok',
    Icon: TikTokIcon,
  },
];

function SnapchatIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12.065 2.004c-3.163.09-5.67 2.723-5.67 5.94v2.632a.46.46 0 0 1-.3.44c-.84.3-2.37 1-2.37 2.49 0 .72.43 1.24 1.1 1.5.22.09.37.3.34.54-.12.96-.75 1.68-1.85 1.99a.49.49 0 0 0-.37.5c.03 1.17 1.09 2.1 2.58 2.4.28.06.5.28.53.56.2 1.75 1.55 3.06 4.09 3.55.34.07.63-.17.66-.51.06-.78.47-1.35 1.22-1.35.75 0 1.16.57 1.22 1.35.03.34.32.58.66.51 2.54-.49 3.89-1.8 4.09-3.55.03-.28.25-.5.53-.56 1.49-.3 2.55-1.23 2.58-2.4a.49.49 0 0 0-.37-.5c-1.1-.31-1.73-1.03-1.85-1.99a.54.54 0 0 1 .34-.54c.67-.26 1.1-.78 1.1-1.5 0-1.49-1.53-2.19-2.37-2.49a.46.46 0 0 1-.3-.44V7.944c0-3.217-2.507-5.85-5.67-5.94z" />
    </svg>
  );
}

function TikTokIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.28 6.34 6.34 0 0 0 9.49 21.6a6.34 6.34 0 0 0 6.34-6.34V8.77a8.2 8.2 0 0 0 4.76 1.52V6.84a4.85 4.85 0 0 1-.99-.15z" />
    </svg>
  );
}

function normalizeUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/**
 * Renders social profile links from store settings (only non-empty URLs).
 */
export function SocialMediaLinks({
  className = '',
  iconClassName = 'w-9 h-9',
  settings: settingsProp,
}) {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => storeApi.settings(),
    enabled: !settingsProp,
    staleTime: 60_000,
  });

  const settings = settingsProp || data?.data || {};

  const links = useMemo(
    () =>
      SOCIAL_DEFS.map((def) => ({
        ...def,
        href: normalizeUrl(settings[def.key]),
      })).filter((l) => l.href),
    [settings]
  );

  if (!links.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} aria-label="وسائل التواصل">
      {links.map(({ key, label, href, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
          aria-label={label}
          className={`inline-flex items-center justify-center rounded-full bg-white/10 text-current ring-1 ring-white/15 hover:bg-secondary-400 hover:text-ink-800 hover:ring-secondary-400 transition ${iconClassName}`}
        >
          <Icon size={18} />
        </a>
      ))}
    </div>
  );
}

export { SOCIAL_DEFS, normalizeUrl };
