import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { SettingsProvider } from '@/context/SettingsContext';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { RouterProvider, useRouter } from '@/context/RouterContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PharmacyOwnerProvider } from '@/context/PharmacyOwnerContext';
import { useSettings } from '@/context/SettingsContext';
import { useCompare } from '@/context/CompareContext';
import { CustomerProvider } from '@/context/CustomerContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { OrderProvider } from '@/context/OrderContext';
import { CompareProvider } from '@/context/CompareContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { OrderModal } from '@/components/OrderModal';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { FloatingActions } from '@/components/FloatingActions';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { WelcomePopup } from '@/components/WelcomePopup';
import { ReminderScheduler } from '@/components/ReminderScheduler';
import { CompareBar } from '@/components/CompareBar';
import { PriceCompareModal } from '@/components/PriceCompareModal';
import { PharmacyCompareModal } from '@/components/PharmacyCompareModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HomePage } from '@/pages/HomePage';
import { SearchPage } from '@/pages/SearchPage';
import { PharmacyDetailPage } from '@/pages/PharmacyDetailPage';
import { CategoryPage } from '@/pages/CategoryPage';
import { AllCategoriesPage } from '@/pages/AllCategoriesPage';
import { AccountPage } from '@/pages/AccountPage';
import { TrackOrderPage } from '@/pages/TrackOrderPage';
import { HealthPage } from '@/pages/HealthPage';
import { HealthArticlePage } from '@/pages/HealthArticlePage';
import { Loader2, ShieldAlert } from 'lucide-react';

const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const AdminLoginPage = lazy(() => import('@/pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const PharmacyAdminPage = lazy(() => import('@/pages/PharmacyAdminPage').then((m) => ({ default: m.PharmacyAdminPage })));

function AdminForbidden() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">غير مصرح</h1>
        <p className="text-gray-500 text-sm mb-6">هذا الحساب لا يملك صلاحيات الوصول إلى لوحة إدارة الموقع.</p>
        <button
          onClick={() => signOut()}
          className="w-full px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:opacity-90 transition-all"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

function AdminRoute() {
  const { user, loading, isAdmin, adminChecked } = useAuth();

  if (loading || !adminChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      {!user ? (
        <AdminLoginPage />
      ) : isAdmin ? (
        <ErrorBoundary>
          <AdminPage />
        </ErrorBoundary>
      ) : (
        <AdminForbidden />
      )}
    </Suspense>
  );
}

function PharmacyAdminRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <PharmacyAdminPage />
    </Suspense>
  );
}

function CompareOverlay() {
  const { featuresConfig } = useSettings();
  const { compareOpen, closeCompare, priceCompareProduct, closePriceCompare } = useCompare();

  if (!featuresConfig.pharmacyCompare && !featuresConfig.priceCompare) return null;

  return (
    <>
      {featuresConfig.pharmacyCompare && <CompareBar />}
      {featuresConfig.pharmacyCompare && compareOpen && <PharmacyCompareModal onClose={closeCompare} />}
      {featuresConfig.priceCompare && priceCompareProduct && (
        <PriceCompareModal product={priceCompareProduct} onClose={closePriceCompare} />
      )}
    </>
  );
}

function SiteContent() {
  const { route, refreshKey } = useRouter();
  const { dir } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir={dir}>
      <AnnouncementBar />
      {route.name !== 'account' && route.name !== 'category' && route.name !== 'categories' && <Header />}
      <main className="flex-1 pb-20 lg:pb-0">
        <ErrorBoundary>
          {route.name === 'home' && <HomePage />}
          {route.name === 'search' && <SearchPage key={refreshKey} query={route.query} />}
          {route.name === 'pharmacy' && <PharmacyDetailPage id={route.id} />}
          {route.name === 'category' && <CategoryPage slug={route.slug} />}
          {route.name === 'categories' && <AllCategoriesPage />}
          {route.name === 'account' && <AccountPage tab={route.tab} />}
          {route.name === 'track' && <TrackOrderPage />}
          {route.name === 'health' && <HealthPage />}
          {route.name === 'healthArticle' && <HealthArticlePage slug={route.slug} />}
        </ErrorBoundary>
      </main>
      <Footer />
      <OrderModal />
      <FloatingActions />
      <MobileBottomNav />
      <WelcomePopup />
      <ReminderScheduler />
      <CompareOverlay />
    </div>
  );
}

function AppContent() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const checkAdmin = () => setPath(window.location.pathname);
    checkAdmin();
    window.addEventListener('popstate', checkAdmin);
    return () => window.removeEventListener('popstate', checkAdmin);
  }, []);

  const isPharmacyAdmin = path.startsWith('/admin/pharmacy');
  const isSiteAdmin = path.startsWith('/admin') && !isPharmacyAdmin;

  // فصل الوضع الليلي: صفحات الأدمن لا تتأثر بوضع الموقع (dark على <html>)
  useLayoutEffect(() => {
    if (isSiteAdmin || isPharmacyAdmin) {
      document.documentElement.classList.remove('dark');
    }
  }, [path, isSiteAdmin, isPharmacyAdmin]);

  if (isPharmacyAdmin) {
    return (
      <LanguageProvider>
        <SettingsProvider>
          <PharmacyOwnerProvider>
            <PharmacyAdminRoute />
          </PharmacyOwnerProvider>
        </SettingsProvider>
      </LanguageProvider>
    );
  }

  if (isSiteAdmin) {
    return (
      <LanguageProvider>
        <AuthProvider>
          <SettingsProvider>
            <AdminRoute />
          </SettingsProvider>
        </AuthProvider>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <SettingsProvider>
        <RouterProvider>
          <CustomerProvider>
            <CompareProvider>
              <FavoritesProvider>
                <OrderProvider>
                  <SiteContent />
                </OrderProvider>
              </FavoritesProvider>
            </CompareProvider>
          </CustomerProvider>
        </RouterProvider>
      </SettingsProvider>
    </LanguageProvider>
  );
}

export default function App() {
  return <AppContent />;
}
