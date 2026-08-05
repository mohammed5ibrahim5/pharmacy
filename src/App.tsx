import { useEffect, useState } from 'react';
import { SettingsProvider } from '@/context/SettingsContext';
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
import { Loader2 } from 'lucide-react';

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
          <AdminRoute />
        </SettingsProvider>
      </AuthProvider>
    );
  }

  return (
    <SettingsProvider>
      <RouterProvider>
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
