// Refs read: v2/apps/v2-portal/src/App.tsx
// Kept: BrowserRouter, route structure, auth redirect pattern
// Adapted: login remains eager, admin surfaces lazy-load after route match

import { lazy, type ReactNode, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth-context';
import { ToastProvider } from './components/toast';
import { ConfirmProvider } from './components/confirm-dialog';
import { LoginPage } from './pages/login';

const MainLayout = lazy(async () => ({
  default: (await import('./layout/main-layout')).MainLayout,
}));
const DashboardPage = lazy(async () => ({
  default: (await import('./pages/dashboard')).DashboardPage,
}));
const ProductListPage = lazy(async () => ({
  default: (await import('./pages/product-list')).ProductListPage,
}));
const ProductFormPage = lazy(async () => ({
  default: (await import('./pages/product-form')).ProductFormPage,
}));
const CategoryListPage = lazy(async () => ({
  default: (await import('./pages/category-list')).CategoryListPage,
}));
const CategoryFormPage = lazy(async () => ({
  default: (await import('./pages/category-form')).CategoryFormPage,
}));
const RfqInboxPage = lazy(async () => ({
  default: (await import('./pages/rfq-inbox')).RfqInboxPage,
}));
const ArtisanListPage = lazy(async () => ({
  default: (await import('./pages/artisan-list')).ArtisanListPage,
}));
const ArtisanFormPage = lazy(async () => ({
  default: (await import('./pages/artisan-form')).ArtisanFormPage,
}));
const QuoteListPage = lazy(async () => ({
  default: (await import('./pages/quote-list')).QuoteListPage,
}));
const QuoteFormPage = lazy(async () => ({
  default: (await import('./pages/quote-form')).QuoteFormPage,
}));
const QuoteDetailPage = lazy(async () => ({
  default: (await import('./pages/quote-detail')).QuoteDetailPage,
}));
const AuditLogPage = lazy(async () => ({
  default: (await import('./pages/audit-log')).AuditLogPage,
}));
const SiteConfigPage = lazy(async () => ({
  default: (await import('./pages/site-config')).SiteConfigPage,
}));
const FileLibraryPage = lazy(async () => ({
  default: (await import('./pages/file-library')).FileLibraryPage,
}));
const ShowroomV2ContentPage = lazy(async () => ({
  default: (await import('./pages/showroom-v2-content')).ShowroomV2ContentPage,
}));

function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  if (state.isHydrating) return <RouteFallback />;
  if (!state.isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function RouteFallback() {
  return <div className="page-section">Đang tải...</div>;
}

function PortalRoutes() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id/edit" element={<ProductFormPage />} />
        <Route path="categories" element={<CategoryListPage />} />
        <Route path="categories/new" element={<CategoryFormPage />} />
        <Route path="categories/:id/edit" element={<CategoryFormPage />} />
        <Route path="rfq" element={<RfqInboxPage />} />
        <Route path="quotes" element={<QuoteListPage />} />
        <Route path="quotes/new" element={<QuoteFormPage />} />
        <Route path="quotes/:id" element={<QuoteDetailPage />} />
        <Route path="quotes/:id/edit" element={<QuoteFormPage />} />
        <Route path="artisans" element={<ArtisanListPage />} />
        <Route path="artisans/new" element={<ArtisanFormPage />} />
        <Route path="artisans/:id/edit" element={<ArtisanFormPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="files" element={<FileLibraryPage />} />
        <Route path="showroom-v2-content" element={<ShowroomV2ContentPage />} />
        <Route path="settings" element={<SiteConfigPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

export function PortalShell() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Suspense fallback={<RouteFallback />}>
              <PortalRoutes />
            </Suspense>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
