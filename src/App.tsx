import { lazy, Suspense, useEffect, useState } from 'react';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { RouterProvider, useRouter } from '@/context/RouterContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PharmacyOwnerProvider } from '@/context/PharmacyOwnerContext';
import { CustomerProvider } from '@/context/CustomerContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { OrderProvider } from '@/context/OrderContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { OrderModal } from '@/components/OrderModal';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { FloatingActions } from '@/components/FloatingActions';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { WelcomePopup } from '@/components/WelcomePopup';
import { ReminderScheduler } from '@/components/ReminderScheduler';
import { HomePage } from '@/pages/HomePage';
import { SearchPage } from '@/pages/SearchPage';
import { PharmacyDetailPage } from '@/pages/PharmacyDetailPage';
import { CategoryPage } from '@/pages/CategoryPage';
import { AccountPage } from '@/pages/AccountPage';
import { Loader2, Cross, ShieldAlert } from 'lucide-react';

const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const AdminLoginPage = lazy(() => import('@/pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const PharmacyAdminPage = lazy(() => import('@/pages/PharmacyAdminPage').then((m) => ({ default: m.PharmacyAdminPage })));

function SiteLoading() {
  const { loading, themeColors } = useSettings();
  const { t } = useLanguage();
  if (!loading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl animate-pulse"
        style={{ backgroundColor: themeColors.priceColor }}
      >
        <Cross className="w-9 h-9 text-white" strokeWidth={2.5} />
      </div>
      <p className="mt-4 text-sm font-bold text-gray-500">{t('جاري تحميل الصيدليتي...')}</p>
    </div>
  );
}

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
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
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
      {!user ? <AdminLoginPage /> : isAdmin ? <AdminPage /> : <AdminForbidden />}
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

function SiteContent() {
  const { route } = useRouter();
  const { dir } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir={dir}>
      <AnnouncementBar />
      <Header />
      <main className="flex-1 pb-20 lg:pb-0">
        {route.name === 'home' && <HomePage />}
        {route.name === 'search' && <SearchPage query={route.query} />}
        {route.name === 'pharmacy' && <PharmacyDetailPage id={route.id} />}
        {route.name === 'category' && <CategoryPage slug={route.slug} />}
        {route.name === 'account' && <AccountPage tab={route.tab} />}
      </main>
      <Footer />
      <OrderModal />
      <FloatingActions />
      <MobileBottomNav />
      <WelcomePopup />
      <ReminderScheduler />
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

  if (isPharmacyAdmin) {
    return (
      <LanguageProvider>
        <SettingsProvider>
          <PharmacyOwnerProvider>
            <SiteLoading />
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
            <SiteLoading />
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
          <SiteLoading />
          <CustomerProvider>
            <FavoritesProvider>
              <OrderProvider>
                <SiteContent />
              </OrderProvider>
            </FavoritesProvider>
          </CustomerProvider>
        </RouterProvider>
      </SettingsProvider>
    </LanguageProvider>
  );
}

export default function App() {
  return <AppContent />;
}
