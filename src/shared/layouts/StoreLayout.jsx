import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Moon, Sun, Home, Package, UserRound, Truck, Heart, Search, Menu, X, Phone, Mail, MapPin, MessageCircle,
} from 'lucide-react';
import { CartIcon } from '@modules/store/components/CartIcon';
import { useTheme } from '@core/config/ThemeContext';
import { useAuth } from '@core/auth/AuthContext';
import { storeSettingsQuery } from '@modules/store/api/storeSettings.query';
import { storeApi } from '@modules/store/api/store.api';
import { SocialMediaLinks } from '@modules/store/components/SocialMediaLinks';
import { CampaignAnnouncementBar } from '@modules/campaigns/components/CampaignAnnouncementBar';
import { StoreSearchForm } from '@modules/store/components/layout/StoreSearchForm';
import { BrandMark } from '@modules/store/components/layout/BrandMark';
import { useWishlist } from '@modules/store/hooks/useWishlist';
import { brandFromSettings } from '@modules/store/utils/brand';
import { POLICY_PAGES } from '@modules/store/utils/policies';
import { toWhatsAppNumber } from '@shared/utils/phone';

const NAV_LINKS = [
  { to: '/', label: 'الرئيسية', end: true },
  { to: '/products', label: 'كل المنتجات', end: true },
  { to: '/products?is_new=true', label: 'وصل حديثاً' },
  { to: '/brands', label: 'البراندات' },
  { to: '/track-order', label: 'تتبع الطلب' },
];

const FOOTER_CATEGORIES_LIMIT = 6;

const mobileNavClass = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0 transition ${
    isActive ? 'text-primary-600' : 'text-gray-500 dark:text-gray-400 hover:text-primary-600'
  }`;

const iconButton =
  'relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-tertiary-200 hover:text-primary-600 dark:text-gray-200 dark:hover:bg-gray-800';

function CountBadge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -top-0.5 -left-0.5 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold leading-none text-white tabular-nums">
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** Real store categories — same ['categories'] query the products page uses (cached, one request). */
function useStoreCategories() {
  const { data } = useQuery({
    queryKey: ['categories'],
    queryFn: () => storeApi.categories(),
    staleTime: 10 * 60_000,
  });
  return data?.data || [];
}

function MobileMenu({ open, onClose, brand, categories, accountTo, accountLabel, dark, toggleTheme, policies }) {
  const panelRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    panelRef.current?.querySelector('a,button')?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const linkClass = 'flex items-center justify-between rounded-xl px-3 py-3 text-base font-medium hover:bg-tertiary-100 dark:hover:bg-gray-800';
  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="قائمة المتجر"
        className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-white shadow-xl dark:bg-gray-900"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3 dark:border-gray-700">
          <BrandMark brand={brand} />
          <button type="button" onClick={onClose} className={iconButton} aria-label="إغلاق القائمة">
            <X size={22} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3" aria-label="روابط المتجر">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} onClick={onClose} className={linkClass}>{l.label}</Link>
          ))}
          <Link to="/wishlist" onClick={onClose} className={linkClass}>المفضلة</Link>
          <Link to={accountTo} onClick={onClose} className={linkClass}>{accountLabel}</Link>
          {categories.length ? (
            <>
              <p className="px-3 pt-5 pb-2 text-xs font-semibold text-ink-400">التصنيفات</p>
              {categories.map((c) => (
                <Link key={c.id} to={`/products?category=${c.id}`} onClick={onClose} className={linkClass}>
                  {c.name_ar}
                </Link>
              ))}
            </>
          ) : null}
          {policies.length ? (
            <>
              <p className="px-3 pt-5 pb-2 text-xs font-semibold text-ink-400">السياسات</p>
              {policies.map((p) => (
                <Link key={p.slug} to={p.path} onClick={onClose} className={linkClass}>{p.title}</Link>
              ))}
            </>
          ) : null}
        </nav>
        <div className="border-t border-ink-100 p-3 dark:border-gray-700">
          <button type="button" onClick={toggleTheme} className={`${linkClass} w-full`}>
            {dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StoreLayout({ children }) {
  const { dark, toggle } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const { count: wishlistCount } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: settingsData } = useQuery({ ...storeSettingsQuery, staleTime: 60_000 });
  const settings = settingsData?.data || {};
  const brand = brandFromSettings(settings);
  const categories = useStoreCategories();
  const policies = POLICY_PAGES.filter((p) => String(settings[p.key] || '').trim());
  const whatsapp = toWhatsAppNumber(settings.store_whatsapp || '');

  // Close the phone menu / search row on navigation
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  const isStaff = user && user.role !== 'customer';
  const accountTo = user ? (isStaff ? '/admin' : '/account') : '/login';
  const accountLabel = user ? (isStaff ? 'لوحة التحكم' : 'حسابي') : 'تسجيل الدخول';
  const isAccountActive = ['/login', '/register', '/account', '/admin'].some((p) => location.pathname.startsWith(p));

  const desktopNavClass = (l) => {
    const [path, query = ''] = l.to.split('?');
    const active = l.end
      ? location.pathname === path && location.search.replace(/^\?/, '') === query
      : location.pathname === path && (!query || location.search.includes(query));
    return `relative py-2 text-sm font-medium transition hover:text-primary-600 ${
      active ? 'text-primary-600 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary-600' : 'text-ink-700 dark:text-gray-200'
    }`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        تخطَّ إلى المحتوى
      </a>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-ink-100 dark:bg-gray-900/95 dark:border-gray-700">
        <CampaignAnnouncementBar />
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center gap-3 lg:gap-6">
            <button type="button" onClick={() => setMenuOpen(true)} className={`${iconButton} lg:hidden -mr-2`} aria-label="فتح القائمة" aria-expanded={menuOpen}>
              <Menu size={22} />
            </button>

            <BrandMark brand={brand} className="shrink-0" />

            <nav className="hidden lg:flex items-center gap-5 xl:gap-7" aria-label="الأقسام الرئيسية">
              {NAV_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className={desktopNavClass(l)}>{l.label}</Link>
              ))}
            </nav>

            <StoreSearchForm className="hidden md:block flex-1 max-w-md ms-auto" inputId="store-search-desktop" />

            <div className="flex items-center gap-0.5 ms-auto md:ms-0">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className={`${iconButton} md:hidden`}
                aria-label="بحث"
                aria-expanded={searchOpen}
              >
                {searchOpen ? <X size={21} /> : <Search size={21} />}
              </button>
              <button type="button" onClick={toggle} className={`${iconButton} hidden lg:inline-flex`} aria-label={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}>
                {dark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <Link to="/wishlist" className={iconButton} aria-label={`المفضلة${wishlistCount ? ` (${wishlistCount})` : ''}`} title="المفضلة">
                <Heart size={21} />
                <CountBadge count={wishlistCount} />
              </Link>
              <Link to="/cart" className={`${iconButton} hidden md:inline-flex`} aria-label="سلة التسوق" title="السلة">
                <CartIcon size={21} badgeClassName="-top-2.5 -left-2.5 text-[10px] min-w-[1.15rem] h-[1.15rem] px-1" />
              </Link>
              <Link
                to={accountTo}
                className={isStaff ? 'btn-primary text-sm hidden md:inline-flex ms-1' : `${iconButton} hidden md:inline-flex`}
                aria-label={accountLabel}
                title={accountLabel}
              >
                {isStaff ? accountLabel : <UserRound size={21} />}
              </Link>
            </div>
          </div>
          {searchOpen ? (
            <div className="pb-3 md:hidden">
              <StoreSearchForm autoFocus onDone={() => setSearchOpen(false)} inputId="store-search-mobile" />
            </div>
          ) : null}
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        brand={brand}
        categories={categories}
        accountTo={accountTo}
        accountLabel={accountLabel}
        dark={dark}
        toggleTheme={toggle}
        policies={policies}
      />

      <main id="main" className="flex-1">{children}</main>

      <footer className="mt-auto bg-ink-800 text-gray-300 pt-12 pb-24 md:pb-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 space-y-4">
              <BrandMark brand={brand} size="lg" inverted />
              <p className="text-sm leading-relaxed text-gray-400 max-w-sm">{brand.about || brand.tagline}</p>
              <SocialMediaLinks settings={settings} />
            </div>

            <nav aria-labelledby="footer-shop">
              <h2 id="footer-shop" className="text-white font-semibold mb-4">تسوّق</h2>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/products" className="hover:text-white">كل المنتجات</Link></li>
                <li><Link to="/products?is_new=true" className="hover:text-white">وصل حديثاً</Link></li>
                <li><Link to="/brands" className="hover:text-white">البراندات</Link></li>
                <li><Link to="/wishlist" className="hover:text-white">المفضلة</Link></li>
                <li><Link to="/cart" className="hover:text-white">السلة</Link></li>
              </ul>
            </nav>

            <nav aria-labelledby="footer-help">
              <h2 id="footer-help" className="text-white font-semibold mb-4">خدمة العملاء</h2>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/track-order" className="hover:text-white">تتبع الطلب</Link></li>
                {policies.map((p) => (
                  <li key={p.slug}><Link to={p.path} className="hover:text-white">{p.title}</Link></li>
                ))}
                <li><Link to={user ? accountTo : '/login'} className="hover:text-white">{user ? accountLabel : 'تسجيل الدخول'}</Link></li>
              </ul>
            </nav>

            {categories.length ? (
              <nav aria-labelledby="footer-categories" className="col-span-2 md:col-span-1">
                <h2 id="footer-categories" className="text-white font-semibold mb-4">التصنيفات</h2>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm md:grid-cols-1">
                  {categories.slice(0, FOOTER_CATEGORIES_LIMIT).map((c) => (
                    <li key={c.id}><Link to={`/products?category=${c.id}`} className="hover:text-white">{c.name_ar}</Link></li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>

          {settings.store_phone || whatsapp || settings.store_email || settings.store_address ? (
            <address className="not-italic mt-10 grid gap-3 border-t border-ink-700 pt-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {settings.store_phone ? (
                <a href={`tel:${String(settings.store_phone).replace(/\s+/g, '')}`} className="inline-flex items-center gap-2 hover:text-white">
                  <Phone size={16} className="text-secondary-400" aria-hidden /> <span dir="ltr">{settings.store_phone}</span>
                </a>
              ) : null}
              {whatsapp ? (
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white">
                  <MessageCircle size={16} className="text-secondary-400" aria-hidden /> واتساب
                </a>
              ) : null}
              {settings.store_email ? (
                <a href={`mailto:${settings.store_email}`} className="inline-flex items-center gap-2 hover:text-white">
                  <Mail size={16} className="text-secondary-400" aria-hidden /> <span dir="ltr">{settings.store_email}</span>
                </a>
              ) : null}
              {settings.store_address ? (
                <p className="inline-flex items-center gap-2">
                  <MapPin size={16} className="text-secondary-400" aria-hidden /> {settings.store_address}
                </p>
              ) : null}
            </address>
          ) : null}

          <p className="mt-8 border-t border-ink-700 pt-6 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} {brand.full} — جميع الحقوق محفوظة
          </p>
        </div>
      </footer>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-ink-100 dark:border-gray-700 pb-[env(safe-area-inset-bottom)]"
        aria-label="التنقل الرئيسي"
      >
        <div className="flex items-stretch h-16">
          <NavLink to="/" end className={mobileNavClass}>
            <Home size={22} strokeWidth={2.25} />
            <span className="text-[11px] font-medium">الرئيسية</span>
          </NavLink>
          <NavLink to="/products" className={mobileNavClass}>
            <Package size={22} strokeWidth={2.25} />
            <span className="text-[11px] font-medium">المنتجات</span>
          </NavLink>
          <NavLink to="/cart" className={mobileNavClass}>
            <CartIcon size={22} strokeWidth={2.25} badgeClassName="-top-2 -left-2.5 text-[10px] min-w-[1.1rem] h-[1.1rem] px-0.5" />
            <span className="text-[11px] font-medium">السلة</span>
          </NavLink>
          <NavLink to="/track-order" className={mobileNavClass}>
            <Truck size={22} strokeWidth={2.25} />
            <span className="text-[11px] font-medium">تتبع</span>
          </NavLink>
          <NavLink
            to={accountTo}
            className={() =>
              `flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0 transition ${
                isAccountActive ? 'text-primary-600' : 'text-gray-500 dark:text-gray-400 hover:text-primary-600'
              }`
            }
          >
            <UserRound size={22} strokeWidth={2.25} />
            <span className="text-[11px] font-medium truncate max-w-[4.5rem]">{user ? (isStaff ? 'الإدارة' : 'حسابي') : 'دخول'}</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
