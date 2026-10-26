import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from '@core/auth/ProtectedRoute';
import StoreAccessGate from '@modules/store/components/StoreAccessGate';
import { ScrollToTop } from '@shared/components/ScrollToTop';
import { LoadingSpinner } from '@shared/ui';

import HomePage from '@modules/store/pages/HomePage';
import StoreProductsPage from '@modules/store/pages/ProductsPage';
import ProductDetailPage from '@modules/store/pages/ProductDetailPage';
import BrandsPage from '@modules/store/pages/BrandsPage';
import BrandPage from '@modules/store/pages/BrandPage';
import CartPage from '@modules/store/pages/CartPage';
import CheckoutPage from '@modules/store/pages/CheckoutPage';
import NotFoundPage from '@modules/store/pages/NotFoundPage';
import PublicCatchAll from '@modules/store/pages/PublicCatchAll';

const CHUNK_RELOAD_KEY = 'karam-chunk-reload';

/**
 * Route-level code splitting: shoppers never download admin / POS code.
 * If a deploy removed the chunk this tab was built against, reload once to pick up the new build.
 */
function lazyPage(load) {
  return lazy(() =>
    load().then(
      (module) => {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        return module;
      },
      (error) => {
        if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
          window.location.reload();
          return new Promise(() => {});
        }
        throw error;
      }
    )
  );
}

const LoginPage = lazyPage(() => import('@modules/auth/pages/LoginPage'));
const RegisterPage = lazyPage(() => import('@modules/auth/pages/RegisterPage'));
const AccountPage = lazyPage(() => import('@modules/auth/pages/AccountPage'));

const AdminLayout = lazyPage(() => import('@shared/layouts/AdminLayout'));
const DashboardPage = lazyPage(() => import('@modules/dashboard/pages/DashboardPage'));
const ProductListPage = lazyPage(() => import('@modules/products/pages/ProductListPage'));
const CategoriesPage = lazyPage(() => import('@modules/categories/pages/CategoriesPage'));
const AdminBrandsPage = lazyPage(() => import('@modules/brands/pages/BrandsPage'));
const InventoryPage = lazyPage(() => import('@modules/inventory/pages/InventoryPage'));
const StocktakingPage = lazyPage(() => import('@modules/inventory/pages/StocktakingPage'));
const PurchasesPage = lazyPage(() => import('@modules/purchases/pages/PurchasesPage'));
const SuppliersPage = lazyPage(() => import('@modules/suppliers/pages/SuppliersPage'));
const BannersPage = lazyPage(() => import('@modules/banners/pages/BannersPage'));
const OrdersPage = lazyPage(() => import('@modules/orders/pages/OrdersPage'));
const CustomersPage = lazyPage(() => import('@modules/customers/pages/CustomersPage'));
const ReportsPage = lazyPage(() => import('@modules/reports/pages/ReportsPage'));
const SettingsPage = lazyPage(() => import('@modules/settings/pages/SettingsPage'));
const UsersPage = lazyPage(() => import('@modules/users/pages/UsersPage'));
const POSPage = lazyPage(() => import('@modules/sales/pages/POSPage'));

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

/** Legacy /products/:slug → clean /product/:slug */
function LegacyProductRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/product/${slug}`} replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Storefront — blocked when site is in maintenance / development */}
          <Route element={<StoreAccessGate />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<StoreProductsPage />} />
            <Route path="/product/:slug" element={<ProductDetailPage />} />
            <Route path="/products/:slug" element={<LegacyProductRedirect />} />
            <Route path="/brands" element={<BrandsPage />} />
            <Route path="/brand/:slug" element={<BrandPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route element={<GuestRoute />}>
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['customer']} />}>
              <Route path="/account" element={<AccountPage />} />
            </Route>
          </Route>

          {/* Auth: login always available (staff need it when shop is closed) */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Admin / POS — always available */}
          <Route element={<ProtectedRoute roles={['admin', 'sales']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="products" element={<ProductListPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="brands" element={<AdminBrandsPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="inventory/stocktaking" element={<StocktakingPage />} />
              <Route path="inventory/stocktaking/:id" element={<StocktakingPage />} />
              <Route path="purchases" element={<PurchasesPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="banners" element={<BannersPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="pos" element={<POSPage />} />
              <Route path="*" element={<NotFoundPage bare />} />
            </Route>
          </Route>

          {/* Catch-all: 404 (or closed site message) */}
          <Route path="*" element={<PublicCatchAll />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
