import { Link } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function StoreLayout({ children }) {
  const { itemCount } = useCart();
  const { dark, toggle } = useTheme();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b dark:bg-gray-900/95 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-2xl font-bold text-primary-600">كرام ستور</Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="hover:text-primary-600 transition">الرئيسية</Link>
              <Link to="/products" className="hover:text-primary-600 transition">المنتجات</Link>
              <Link to="/cart" className="hover:text-primary-600 transition">السلة</Link>
            </nav>

            <div className="flex items-center gap-3">
              <button onClick={toggle} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                {dark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <Link to="/cart" className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <ShoppingCart size={22} />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
              {user ? (
                user.role === 'customer' ? (
                  <Link to="/account" className="btn-outline text-sm hidden md:inline-flex">{user.name}</Link>
                ) : (
                  <Link to="/admin" className="btn-primary text-sm hidden md:inline-flex">لوحة التحكم</Link>
                )
              ) : (
                <Link to="/login" className="btn-primary text-sm hidden md:inline-flex">تسجيل الدخول</Link>
              )}
              <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
            <Link to="/" className="block py-2" onClick={() => setMenuOpen(false)}>الرئيسية</Link>
            <Link to="/products" className="block py-2" onClick={() => setMenuOpen(false)}>المنتجات</Link>
            <Link to="/cart" className="block py-2" onClick={() => setMenuOpen(false)}>السلة</Link>
            <Link to="/login" className="block py-2" onClick={() => setMenuOpen(false)}>تسجيل الدخول</Link>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-gray-900 text-gray-300 py-12 mt-auto">
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white text-lg font-bold mb-4">كرام ستور</h3>
            <p className="text-sm">متجر إلكتروني ليبي - الدفع عند الاستلام</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">روابط سريعة</h4>
            <div className="space-y-2 text-sm">
              <Link to="/products" className="block hover:text-white">المنتجات</Link>
              <Link to="/cart" className="block hover:text-white">السلة</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">تواصل معنا</h4>
            <p className="text-sm">0910000000</p>
            <p className="text-sm">info@karamstore.ly</p>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-center text-sm">
          © 2026 كرام ستور - جميع الحقوق محفوظة
        </div>
      </footer>
    </div>
  );
}
