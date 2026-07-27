import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from '@core/auth/ProtectedRoute';
import AdminLayout from '@shared/layouts/AdminLayout';

import HomePage from '@modules/store/pages/HomePage';
import StoreProductsPage from '@modules/store/pages/ProductsPage';
import ProductDetailPage from '@modules/store/pages/ProductDetailPage';
import CartPage from '@modules/store/pages/CartPage';
import CheckoutPage from '@modules/store/pages/CheckoutPage';

import LoginPage from '@modules/auth/pages/LoginPage';

import DashboardPage from '@modules/dashboard/pages/DashboardPage';
import ProductListPage from '@modules/products/pages/ProductListPage';
import CategoriesPage from '@modules/categories/pages/CategoriesPage';
import InventoryPage from '@modules/inventory/pages/InventoryPage';
import StocktakingPage from '@modules/inventory/pages/StocktakingPage';
import PurchasesPage from '@modules/purchases/pages/PurchasesPage';
import SuppliersPage from '@modules/suppliers/pages/SuppliersPage';
import BannersPage from '@modules/banners/pages/BannersPage';
import OrdersPage from '@modules/orders/pages/OrdersPage';
import CustomersPage from '@modules/customers/pages/CustomersPage';
import ReportsPage from '@modules/reports/pages/ReportsPage';
import SettingsPage from '@modules/settings/pages/SettingsPage';
import POSPage from '@modules/sales/pages/POSPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Storefront */}
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<StoreProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />

        {/* Auth */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Admin / POS */}
        <Route element={<ProtectedRoute roles={['admin', 'sales']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductListPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/stocktaking" element={<StocktakingPage />} />
            <Route path="inventory/stocktaking/:id" element={<StocktakingPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="banners" element={<BannersPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="pos" element={<POSPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
