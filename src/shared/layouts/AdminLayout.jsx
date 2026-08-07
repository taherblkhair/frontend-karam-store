import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderTree, Warehouse, ShoppingBag,
  Users, UserCog, BarChart3, Settings, LogOut, Menu, Monitor, Truck, ShoppingCart, Image, X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@core/auth/AuthContext';
import { useTheme } from '@core/config/ThemeContext';

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'لوحة التحكم', end: true },
  { to: '/admin/products', icon: Package, label: 'المنتجات' },
  { to: '/admin/categories', icon: FolderTree, label: 'الفئات' },
  { to: '/admin/inventory', icon: Warehouse, label: 'المخزون' },
  { to: '/admin/purchases', icon: Truck, label: 'المشتريات' },
  { to: '/admin/suppliers', icon: Truck, label: 'الموردون' },
  { to: '/admin/banners', icon: Image, label: 'البنرات' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'الطلبات' },
  { to: '/admin/customers', icon: Users, label: 'العملاء' },
  { to: '/admin/users', icon: UserCog, label: 'المستخدمون', permission: 'users.manage' },
  { to: '/admin/reports', icon: BarChart3, label: 'التقارير' },
  { to: '/admin/settings', icon: Settings, label: 'الإعدادات' },
];

const salesLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'لوحة التحكم', end: true },
  { to: '/admin/pos', icon: Monitor, label: 'نقطة البيع' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'الطلبات' },
];

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

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-[100dvh] flex bg-gray-100 dark:bg-gray-900">
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-[min(18rem,85vw)] max-w-full bg-white dark:bg-gray-800 border-l dark:border-gray-700 transform transition-transform duration-200 ease-out flex flex-col safe-pt ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'
        } ${isPos ? '' : 'lg:translate-x-0 lg:static lg:shadow-none'}`}
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

      {sidebarOpen && (
        <div
          className={`fixed inset-0 bg-black/50 z-40 backdrop-blur-[1px] ${isPos ? '' : 'lg:hidden'}`}
          onClick={closeSidebar}
          aria-hidden
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-[100dvh]">
        <header className="h-14 sm:h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between gap-3 px-3 sm:px-6 sticky top-0 z-30 safe-pt">
          <button
            type="button"
            className={`p-2 -mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${isPos ? '' : 'lg:hidden'}`}
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
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
          className={`flex-1 overflow-auto overscroll-contain safe-pb ${
            isPos ? 'p-2 sm:p-4' : 'p-3 sm:p-4 lg:p-6'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
