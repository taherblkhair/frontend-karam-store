import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderTree, Warehouse, ShoppingBag,
  Users, BarChart3, Settings, LogOut, Menu, Monitor, Truck, ShoppingCart, Image, X
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
  const links = isAdmin ? adminLinks : salesLinks;

  useEffect(() => {
    if (isPos) setSidebarOpen(false);
  }, [isPos, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-white dark:bg-gray-800 border-l dark:border-gray-700 transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isPos ? '' : 'lg:translate-x-0 lg:static'}`}
      >
        <div className="p-6 border-b dark:border-gray-700 flex items-start justify-between gap-2">
          <div>
            <Link to="/" className="text-xl font-bold text-primary-600">كرام ستور</Link>
            <p className="text-sm text-gray-500 mt-1">{user?.name}</p>
          </div>
          {isPos && (
            <button
              type="button"
              onClick={closeSidebar}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="إغلاق القائمة"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <nav className="p-4 space-y-1">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
          {hasPermission('pos.use') && isAdmin && (
            <NavLink
              to="/admin/pos"
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <Monitor size={20} /> نقطة البيع
            </NavLink>
          )}
          <Link
            to="/"
            onClick={closeSidebar}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ShoppingCart size={20} /> المتجر
          </Link>
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t dark:border-gray-700">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut size={20} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className={`fixed inset-0 bg-black/50 z-40 ${isPos ? '' : 'lg:hidden'}`}
          onClick={closeSidebar}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 sm:h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            className={isPos ? '' : 'lg:hidden'}
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-semibold hidden sm:block">
            {isPos ? 'نقطة البيع' : 'لوحة التحكم'}
          </h1>
          <button onClick={toggle} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            {dark ? '☀️' : '🌙'}
          </button>
        </header>
        <main className={`flex-1 overflow-auto ${isPos ? 'p-3 sm:p-4' : 'p-6'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
