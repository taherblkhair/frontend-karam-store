import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from '@core/auth/ProtectedRoute';
import StoreAccessGate from '@modules/store/components/StoreAccessGate';
import { ScrollToTop } from '@shared/components/ScrollToTop';
import { LoadingSpinner } from '@shared/ui';

import HomePage from '@modules/store/pages/HomePage';
import StoreProductsPage from '@modules/store/pages/ProductsPage';
import ProductDetailPage from '@modules/store/pages/ProductDetailPage';
import NotFoundPage from '@modules/store/pages/NotFoundPage';
import PublicCatchAll from '@modules/store/pages/PublicCatchAll';
import CampaignPage from '@modules/store/pages/CampaignPage';

const CHUNK_RELOAD_KEY = 'karam-chunk-reload';

/**
 * Route-level code splitting: shoppers never download admin / POS code.
 * If a deploy removed the chunk this tab was built against, reload once to pick up the new build.
 */
function lazyPage(load) {
  return lazy(() =>
    load().then(
      (module) => {
        try {
          sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        } catch {
          /* storage blocked (some in-app browsers) */
        }
        return module;
      },
      (error) => {
        let reloaded = true;
        try {
          reloaded = Boolean(sessionStorage.getItem(CHUNK_RELOAD_KEY));
          if (!reloaded) sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        } catch {
          reloaded = true;
        }
        if (!reloaded) {
          window.location.reload();
          return new Promise(() => {});
        }
        throw error;
      }
    )
  );
}

/*
 * Storefront: the ad landing pages (home, products, product, campaign) stay in the main bundle
 * so a first visit from an ad renders without an extra round trip. The rest of the store is
 * split out and fetched while the browser is idle, so it is ready before the shopper taps it.
 */
const storeChunks = {
  cart: () => import('@modules/store/pages/CartPage'),
  checkout: () => import('@modules/store/pages/CheckoutPage'),
  brands: () => import('@modules/store/pages/BrandsPage'),
  brand: () => import('@modules/store/pages/BrandPage'),
  trackOrder: () => import('@modules/store/pages/TrackOrderPage'),
  wishlist: () => import('@modules/store/pages/WishlistPage'),
  policy: () => import('@modules/store/pages/PolicyPage'),
  shipping: () => import('@modules/store/pages/ShippingPricesPage'),
};
const CartPage = lazyPage(storeChunks.cart);
const CheckoutPage = lazyPage(storeChunks.checkout);
const BrandsPage = lazyPage(storeChunks.brands);
const BrandPage = lazyPage(storeChunks.brand);
const TrackOrderPage = lazyPage(storeChunks.trackOrder);
const WishlistPage = lazyPage(storeChunks.wishlist);
const PolicyPage = lazyPage(storeChunks.policy);
const ShippingPricesPage = lazyPage(storeChunks.shipping);

function prefetchStoreChunks() {
  if (typeof window === 'undefined') return;
  if (/^\/(admin|login)(\/|$)/.test(window.location.pathname)) return;
  const run = () => {
    // Cart + checkout first: they are the next steps of an order
    Object.values(storeChunks).forEach((load) => load().catch(() => {}));
  };
  const idle = () =>
    'requestIdleCallback' in window
      ? window.requestIdleCallback(run, { timeout: 4000 })
      : run();
  // A few seconds after load: on a slow in-app connection the page's own images (the LCP)
  // and the Pixel are still downloading right after `load`; don't compete with them.
  const later = () => window.setTimeout(idle, 3000);
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
}
prefetchStoreChunks();

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
const CampaignsPage = lazyPage(() => import('@modules/campaigns/pages/CampaignsPage'));
const CampaignDetailPage = lazyPage(() => import('@modules/campaigns/pages/CampaignDetailPage'));
const OrdersPage = lazyPage(() => import('@modules/orders/pages/OrdersPage'));
const OrderDetailPage = lazyPage(() => import('@modules/orders/pages/OrderDetailPage'));
const CustomersPage = lazyPage(() => import('@modules/customers/pages/CustomersPage'));
const ReportsPage = lazyPage(() => import('@modules/reports/pages/ReportsPage'));
const ProfitReportPage = lazyPage(() => import('@modules/reports/pages/ProfitReportPage'));
const SalesReportPage = lazyPage(() => import('@modules/reports/pages/SalesReportPage'));
const InventoryReportPage = lazyPage(() => import('@modules/reports/pages/InventoryReportPage'));
const StockAvailabilityReportPage = lazyPage(() =>
  import('@modules/reports/pages/StockAvailabilityReportPage')
);
const SettingsPage = lazyPage(() => import('@modules/settings/pages/SettingsPage'));
const UsersPage = lazyPage(() => import('@modules/users/pages/UsersPage'));
const POSPage = lazyPage(() => import('@modules/sales/pages/POSPage'));
const NotificationsPage = lazyPage(() => import('@modules/notifications/pages/NotificationsPage'));

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

/**
 * A tapped push notification while the app is already open: the service worker asks the app
 * to open the order in place (same tab, no reload). Paths on this site only.
 */
function ServiceWorkerNavigation() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const onMessage = (event) => {
      const url = event.data?.type === 'karam:navigate' ? String(event.data.url || '') : '';
      if (url.startsWith('/') && !url.startsWith('//')) navigate(url);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate]);
  return null;
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
      <ServiceWorkerNavigation />
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
            <Route path="/campaigns/:slug" element={<CampaignPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/pages/:slug" element={<PolicyPage />} />
            <Route path="/shipping" element={<ShippingPricesPage />} />
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
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="campaigns/:id" element={<CampaignDetailPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="reports/profit" element={<ProfitReportPage />} />
              <Route path="reports/sales" element={<SalesReportPage />} />
              <Route path="reports/inventory" element={<InventoryReportPage />} />
              <Route path="reports/stock-availability" element={<StockAvailabilityReportPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
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
