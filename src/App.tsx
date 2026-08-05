import { useEffect, useState } from 'react';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { RouterProvider, useRouter } from '@/context/RouterContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CustomerProvider } from '@/context/CustomerContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { OrderProvider } from '@/context/OrderContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { OrderModal } from '@/components/OrderModal';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { HomePage } from '@/pages/HomePage';
import { SearchPage } from '@/pages/SearchPage';
import { PharmacyDetailPage } from '@/pages/PharmacyDetailPage';
import { CategoryPage } from '@/pages/CategoryPage';
import { AccountPage } from '@/pages/AccountPage';
import { AdminPage } from '@/pages/AdminPage';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { Loader2, Cross } from 'lucide-react';

function SiteLoading() {
  const { loading, settings } = useSettings();
  if (!loading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl animate-pulse"
        style={{ backgroundColor: settings.primary_color }}
      >
        <Cross className="w-9 h-9 text-white" strokeWidth={2.5} />
      </div>
      <p className="mt-4 text-sm font-bold text-gray-500">جاري تحميل الصيدليتي...</p>
    </div>
  );
}

function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return <AdminLoginPage />;
  }

  return <AdminPage />;
}

function SiteContent() {
  const { route } = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      <AnnouncementBar />
      <Header />
      <main className="flex-1">
        {route.name === 'home' && <HomePage />}
        {route.name === 'search' && <SearchPage query={route.query} />}
        {route.name === 'pharmacy' && <PharmacyDetailPage id={route.id} />}
        {route.name === 'category' && <CategoryPage slug={route.slug} />}
        {route.name === 'account' && <AccountPage tab={route.tab} />}
      </main>
      <Footer />
      <OrderModal />
    </div>
  );
}

function AppContent() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = () => {
      setIsAdmin(window.location.pathname.startsWith('/admin'));
    };
    checkAdmin();
    window.addEventListener('popstate', checkAdmin);
    return () => window.removeEventListener('popstate', checkAdmin);
  }, []);

  if (isAdmin) {
    return (
      <AuthProvider>
        <SettingsProvider>
          <SiteLoading />
          <AdminRoute />
        </SettingsProvider>
      </AuthProvider>
    );
  }

  return (
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
  );
}

export default function App() {
  return <AppContent />;
}
