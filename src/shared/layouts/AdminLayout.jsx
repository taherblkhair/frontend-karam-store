import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderTree, Warehouse, ShoppingBag,
  Users, UserCog, BarChart3, Settings, LogOut, Menu, Monitor, Truck, ShoppingCart, Image, Tag, X,
  BadgePercent, Bell,
} from 'lucide-react';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@core/auth/AuthContext';
import { useTheme } from '@core/config/ThemeContext';
import { LoadingSpinner } from '@shared/ui';
import { useDrawer, drawerMotion } from '@shared/hooks/useDrawer';
import { pushApi } from '@modules/notifications/api/push.api';
import { currentSubscription } from '@modules/notifications/utils/pushDevice';

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'لوحة التحكم', end: true },
  { to: '/admin/products', icon: Package, label: 'المنتجات' },
  { to: '/admin/categories', icon: FolderTree, label: 'الفئات' },
  { to: '/admin/brands', icon: Tag, label: 'البراندات' },
  { to: '/admin/inventory', icon: Warehouse, label: 'المخزون' },
  { to: '/admin/purchases', icon: Truck, label: 'المشتريات' },
  { to: '/admin/suppliers', icon: Truck, label: 'الموردون' },
  { to: '/admin/banners', icon: Image, label: 'البنرات' },
  { to: '/admin/campaigns', icon: BadgePercent, label: 'حملات التخفيضات' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'الطلبات' },
  { to: '/admin/customers', icon: Users, label: 'العملاء' },
  { to: '/admin/users', icon: UserCog, label: 'المستخدمون', permission: 'users.manage' },
  { to: '/admin/reports', icon: BarChart3, label: 'التقارير' },
  { to: '/admin/notifications', icon: Bell, label: 'الإشعارات' },
  { to: '/admin/settings', icon: Settings, label: 'الإعدادات' },
];

const salesLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'لوحة التحكم', end: true },
  { to: '/admin/pos', icon: Monitor, label: 'نقطة البيع' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'الطلبات' },
  { to: '/admin/notifications', icon: Bell, label: 'الإشعارات' },
];

/**
 * "Add to Home Screen" from the dashboard installs the dashboard app (opens /admin),
 * not the storefront — the manifest link is swapped while the dashboard is open.
 */
function useAdminManifest() {
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return undefined;
    const previous = link.getAttribute('href');
    link.setAttribute('href', '/admin.webmanifest');
    const title = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    const previousTitle = title?.getAttribute('content');
    title?.setAttribute('content', 'لوحة كرم');
    return () => {
      link.setAttribute('href', previous);
      if (title && previousTitle) title.setAttribute('content', previousTitle);
    };
  }, []);
}

/** Signing out of a device stops its order notifications (best effort, never blocks logout). */
async function stopPushOnThisDevice() {
  try {
    const sub = await currentSubscription();
    if (!sub) return;
    await Promise.race([pushApi.removeByEndpoint(sub.endpoint), new Promise((r) => setTimeout(r, 2500))]).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  } catch {
    /* ignore */
  }
}

export default function AdminLayout() {
  const { user, logout, isAdmin, hasPermission } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isPos = location.pathname.startsWith('/admin/pos');
  const links = (isAdmin ? adminLinks : salesLinks).filter(
    (link) => !link.permission || hasPermission(link.permission)
  );

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Phone / POS drawer: no page scroll behind it, Escape closes, focus in and back
  const asideRef = useRef(null);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  useDrawer(sidebarOpen, closeSidebar, asideRef);

  useAdminManifest();

  const handleLogout = async () => {
    await stopPushOnThisDevice();
    logout();
    navigate('/login');
  };

  return (
    <div className="h-[100dvh] flex overflow-hidden bg-gray-100 dark:bg-gray-900">
      <aside
        ref={asideRef}
        id="admin-sidebar"
        className={`fixed inset-y-0 right-0 z-50 w-[min(18rem,85vw)] max-w-full bg-white dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col safe-pt ${
          drawerMotion.panel(sidebarOpen, { standalone: true })
        } ${sidebarOpen ? 'shadow-2xl' : ''} ${
          isPos ? '' : 'lg:visible lg:pointer-events-auto lg:translate-x-0 lg:opacity-100 lg:transition-none lg:static lg:shadow-none'
        }`}
      >
        <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex items-start justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <Link to="/" className="text-lg sm:text-xl font-bold text-primary-600 block truncate">
              متجر كرم
            </Link>
            <p className="text-sm text-gray-500 mt-1 truncate">{user?.name}</p>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0 ${isPos ? '' : 'lg:hidden'}`}
            aria-label="إغلاق القائمة"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 sm:p-4 space-y-1 flex-1 overflow-y-auto overscroll-contain safe-pb">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition text-sm sm:text-base ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <Icon size={20} className="shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
          {hasPermission('pos.use') && isAdmin && (
            <NavLink
              to="/admin/pos"
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition text-sm sm:text-base ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <Monitor size={20} className="shrink-0" /> نقطة البيع
            </NavLink>
          )}
          <Link
            to="/"
            onClick={closeSidebar}
            className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm sm:text-base"
          >
            <ShoppingCart size={20} className="shrink-0" /> المتجر
          </Link>
        </nav>

        <div className="shrink-0 p-3 sm:p-4 border-t dark:border-gray-700 safe-pb">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 w-full rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm sm:text-base"
          >
            <LogOut size={20} className="shrink-0" /> تسجيل الخروج
          </button>
        </div>
      </aside>

      <div
        className={`fixed inset-0 bg-black/50 z-40 backdrop-blur-[1px] ${drawerMotion.overlay(sidebarOpen, { standalone: true })} ${isPos ? '' : 'lg:hidden'}`}
        onClick={closeSidebar}
        aria-hidden
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full">
        <header className="h-14 sm:h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between gap-3 px-3 sm:px-6 z-30 shrink-0 safe-pt">
          <button
            type="button"
            className={`p-2 -mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${isPos ? '' : 'lg:hidden'}`}
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base sm:text-lg font-semibold truncate flex-1 text-center sm:text-start">
            {isPos ? 'نقطة البيع' : 'لوحة التحكم'}
          </h1>
          <button
            type="button"
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
            aria-label="تبديل الوضع الليلي"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </header>
        <main
          className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain safe-pb ${
            isPos ? 'p-2 sm:p-4' : 'p-3 sm:p-4 lg:p-6'
          }`}
        >
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
