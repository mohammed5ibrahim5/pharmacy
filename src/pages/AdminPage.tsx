import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Store, Package, Settings, X, TrendingDown, List, ArrowLeft,
  Cross, LogOut, Users, Menu, ShoppingCart, Sparkles, FileText, Ticket, Inbox,
  BellRing, Moon, Sun, MessageSquareQuote, Calculator, BarChart3
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import {
  DashboardTab,
  OrdersTab,
  PrescriptionsTab,
  PharmaciesTab,
  ProductsTab,
  CategoriesTab,
  DiscountsTab,
  CouponsTab,
  ReviewsTab,
  CustomersTab,
  SubscribersTab,
  StockAlertsTab,
  LoyaltyTab,
  DoseRulesTab,
  AnalyticsTab,
  SettingsTab,
} from './admin/tabs';

type AdminTab = 'dashboard' | 'orders' | 'prescriptions' | 'pharmacies' | 'products' | 'categories' | 'discounts' | 'coupons' | 'reviews' | 'customers' | 'subscribers' | 'stockAlerts' | 'loyalty' | 'doseRules' | 'analytics' | 'settings';

export function AdminPage() {
  const settingsContext = useSettings();
  const { settings } = settingsContext;
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminDark, setAdminDark] = useState(() => localStorage.getItem('pharmacy-admin-dark-mode') === '1');

  useEffect(() => {
    localStorage.setItem('pharmacy-admin-dark-mode', adminDark ? '1' : '0');
  }, [adminDark]);

  const [newRxCount, setNewRxCount] = useState(0);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  useEffect(() => {
    const fetchRxCount = async () => {
      const { count } = await supabase
        .from('prescriptions')
        .select('id', { count: 'exact', head: true })
        .in('pipeline_status', ['needs_review', 'pending_ocr']);
      if (typeof count === 'number') setNewRxCount(count);
    };
    const fetchOrdersCount = async () => {
      const { count } = await supabase
        .from('order_groups')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (typeof count === 'number') setNewOrdersCount(count);
    };
    fetchRxCount();
    fetchOrdersCount();
    const timer = setInterval(() => { void fetchRxCount(); void fetchOrdersCount(); }, 15000);
    const channel = supabase
      .channel('admin-rx-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => { void fetchRxCount(); })
      .subscribe();
    const ordersChannel = supabase
      .channel('admin-orders-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_groups' }, () => { void fetchOrdersCount(); })
      .subscribe();
    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
      void supabase.removeChannel(ordersChannel);
    };
  }, []);

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'analytics', label: 'التحليلات والسجل', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'orders', label: 'طلبات العملاء', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'prescriptions', label: 'الروشتات الواردة', icon: <FileText className="w-5 h-5" /> },
    { id: 'pharmacies', label: 'الصيدليات', icon: <Store className="w-5 h-5" /> },
    { id: 'products', label: 'المنتجات', icon: <Package className="w-5 h-5" /> },
    { id: 'categories', label: 'الفئات', icon: <List className="w-5 h-5" /> },
    { id: 'discounts', label: 'الخصومات', icon: <TrendingDown className="w-5 h-5" /> },
    { id: 'coupons', label: 'أكواد الخصم', icon: <Ticket className="w-5 h-5" /> },
    { id: 'reviews', label: 'تقييمات العملاء', icon: <MessageSquareQuote className="w-5 h-5" /> },
    { id: 'customers', label: 'العملاء', icon: <Users className="w-5 h-5" /> },
    { id: 'stockAlerts', label: 'تنبيهات التوفر', icon: <BellRing className="w-5 h-5" /> },
    { id: 'loyalty', label: 'نقاط الولاء', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'doseRules', label: 'قواعد جرعات الأطفال', icon: <Calculator className="w-5 h-5" /> },
    { id: 'subscribers', label: 'المشتركون بالنشرة', icon: <Inbox className="w-5 h-5" /> },
    { id: 'settings', label: 'إعدادات الموقع', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex ${adminDark ? 'admin-dark' : ''}`} dir="rtl">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 right-0 z-50 w-72 bg-gray-900 text-white shadow-2xl transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: settings.primary_color }}
              >
                <Cross className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="font-bold text-sm">{settings.site_name}</h2>
                <p className="text-xs text-gray-400">لوحة التحكم</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto pb-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === item.id ? 'bg-white/10 font-medium' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                {item.label}
                {(() => {
                  const badgeCount =
                    item.id === 'prescriptions' ? newRxCount :
                    item.id === 'orders' ? newOrdersCount : 0;
                  if (badgeCount <= 0) return null;
                  return (
                    <span className="ms-auto min-w-[1.35rem] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-extrabold flex items-center justify-center shadow-sm ring-2 ring-emerald-500/20">
                      {badgeCount > 99 ? '+99' : badgeCount}
                    </span>
                  );
                })()}
              </button>
            ))}
          </nav>

          <div className="border-t border-white/10 pt-4 mt-4 space-y-1">
            <div className="px-3 py-2 mb-2">
              <p className="text-xs text-gray-500">المسجل دخول</p>
              <p className="text-xs text-gray-300 truncate" dir="ltr">{user?.email}</p>
            </div>
            <button
              onClick={goHome}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              عرض الموقع
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAdminDark((v) => !v)}
              className="relative p-2.5 rounded-2xl border transition-colors"
              style={{ backgroundColor: `${settings.primary_color}08`, color: adminDark ? '#e2e8f0' : '#374151', borderColor: `${settings.primary_color}20` }}
              title={adminDark ? 'الوضع الفاتح' : 'الوضع الليلي'}
              aria-label={adminDark ? 'الوضع الفاتح' : 'الوضع الليلي'}
            >
              <Sun className={`w-5 h-5 transition-transform duration-300 ${adminDark ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`} />
              <Moon className={`absolute inset-0 m-auto w-5 h-5 transition-transform duration-300 ${adminDark ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
            </button>
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              متصل
            </span>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: settings.primary_color }}
            >
              {(user?.email?.charAt(0) || 'A').toUpperCase()}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'prescriptions' && <PrescriptionsTab />}
          {activeTab === 'pharmacies' && <PharmaciesTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'discounts' && <DiscountsTab />}
          {activeTab === 'coupons' && <CouponsTab />}
          {activeTab === 'reviews' && <ReviewsTab />}
          {activeTab === 'customers' && <CustomersTab />}
          {activeTab === 'stockAlerts' && <StockAlertsTab />}
          {activeTab === 'loyalty' && <LoyaltyTab />}
          {activeTab === 'doseRules' && <DoseRulesTab />}
          {activeTab === 'subscribers' && <SubscribersTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}
