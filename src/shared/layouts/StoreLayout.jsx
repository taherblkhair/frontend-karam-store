import { NavLink, Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Moon, Sun, Home, Package, UserRound } from 'lucide-react';
import { useCart } from '@modules/store/context/CartContext';
import { useTheme } from '@core/config/ThemeContext';
import { useAuth } from '@core/auth/AuthContext';

const mobileNavClass = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0 transition ${
    isActive
      ? 'text-primary-600'
      : 'text-gray-500 dark:text-gray-400 hover:text-primary-600'
  }`;

export default function StoreLayout({ children }) {
  const { itemCount } = useCart();
  const { dark, toggle } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  const accountTo = user
    ? user.role === 'customer'
      ? '/account'
      : '/admin'
    : '/login';

  const accountLabel = user
    ? user.role === 'customer'
      ? 'حسابي'
      : 'الإدارة'
    : 'دخول';

  const isAccountActive =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/account') ||
    location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-ink-100 dark:bg-gray-900/95 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            <Link to="/" className="text-xl md:text-2xl font-display font-bold text-primary-600">
              متجر كرم
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="hover:text-primary-600 transition">
                الرئيسية
              </Link>
              <Link to="/products" className="hover:text-primary-600 transition">
                المنتجات
              </Link>
              <Link to="/cart" className="hover:text-primary-600 transition">
                السلة
              </Link>
            </nav>

            <div className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                onClick={toggle}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="تبديل المظهر"
              >
                {dark ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Cart stays in header on desktop; mobile uses bottom nav */}
              <Link
                to="/cart"
                className="relative hidden md:inline-flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ShoppingCart size={22} />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Link>

              {user ? (
                user.role === 'customer' ? (
                  <Link to="/account" className="btn-outline text-sm hidden md:inline-flex">
                    حسابي
                  </Link>
                ) : (
                  <Link to="/admin" className="btn-primary text-sm hidden md:inline-flex">
                    لوحة التحكم
                  </Link>
                )
              ) : (
                <>
                  <Link to="/register" className="btn-outline text-sm hidden md:inline-flex">
                    إنشاء حساب
                  </Link>
                  <Link to="/login" className="btn-primary text-sm hidden md:inline-flex">
                    تسجيل الدخول
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      <footer className="hidden md:block bg-ink-800 text-gray-300 py-12 mt-auto">
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white text-lg font-display font-bold mb-4">متجر كرم</h3>
            <p className="text-sm">متجر إلكتروني ليبي - الدفع عند الاستلام</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">روابط سريعة</h4>
            <div className="space-y-2 text-sm">
              <Link to="/products" className="block hover:text-white">
                المنتجات
              </Link>
              <Link to="/cart" className="block hover:text-white">
                السلة
              </Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">تواصل معنا</h4>
            <p className="text-sm">0910000000</p>
            <p className="text-sm">info@karamstore.ly</p>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-8 border-t border-ink-700 text-center text-sm">
          © 2026 متجر كرم - جميع الحقوق محفوظة
        </div>
      </footer>

      {/* Mobile bottom navigation */}
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
            <span className="relative inline-flex">
              <ShoppingCart size={22} strokeWidth={2.25} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -left-2.5 bg-primary-600 text-white text-[10px] min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full flex items-center justify-center leading-none">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </span>
            <span className="text-[11px] font-medium">السلة</span>
          </NavLink>

          <NavLink
            to={accountTo}
            className={() =>
              `flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0 transition ${
                isAccountActive
                  ? 'text-primary-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-primary-600'
              }`
            }
          >
            <UserRound size={22} strokeWidth={2.25} />
            <span className="text-[11px] font-medium truncate max-w-[4.5rem]">{accountLabel}</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
