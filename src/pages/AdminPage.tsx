import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard, Store, Package, Settings, Plus, Edit2, Trash2,
  X, Search, MapPin, Phone, Star, Truck, Save, Eye, EyeOff,
  TrendingDown, List, ArrowLeft, Check, Image as ImageIcon, Cross,
  LogOut, Clock, Shield, Globe,
  Megaphone, Users, Activity,
  Menu, ShoppingCart, User, Mail,
  ChevronDown, ShieldCheck, Sparkles, FileText,
  Send, Loader2, Wallet, Info, Zap, Ticket, Copy, Inbox, Ban, Navigation, ExternalLink, BellRing, Bell, Pill, Layers, Printer, MessageCircle, Moon, Sun, KeyRound, Link2, UserCog, BadgePercent, Baby, ChevronUp, MessageSquareQuote, Scale
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings, DEFAULT_THEME_COLORS, DEFAULT_HEADER_CONFIG, DEFAULT_FOOTER_CONFIG, DEFAULT_HERO_CONFIG, DEFAULT_HOW_IT_WORKS_CONFIG, DEFAULT_PAYMENT_CONFIG, DEFAULT_STORE_CONFIG, DEFAULT_HOMEPAGE_CONFIG, DEFAULT_LOYALTY_CONFIG, DEFAULT_FEATURES_CONFIG, type ThemeColors, type LoyaltyConfig, type FeaturesConfig, type WelcomePopupConfig } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { translateError } from '@/lib/errorMessages';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import {
  ORDER_STATUSES,
  ORDER_STATUS_META,
} from '@/lib/orders';
import {
  PHARMACY_SECTION_KEYS,
  PHARMACY_SECTIONS_META,
  type PharmacySectionKey,
} from '@/lib/pharmacySections';
import { ImageUploader } from '@/components/ImageUploader';
import { PrivateImage, PrivateLink } from '@/components/PrivateImage';
import { InvoiceModal } from '@/components/InvoiceModal';
import { CATEGORY_ICON_MAP, categoryColor, categoryIcon } from '@/lib/categoryStyles';
import { HERO_BADGE_ICON_MAP, heroBadgeIcon } from '@/lib/heroBadges';
import {
  PRESCRIPTION_STATUSES,
  PRESCRIPTION_STATUS_META,
  type Prescription,
  deletePrescription,
} from '@/lib/prescriptions';
import { insertNotification } from '@/lib/notifications';
import { notifyStockAvailable } from '@/lib/loyalty';
import type { Pharmacy, Product, Category, Discount, SiteSettings, FooterConfig, Coupon, NewsletterSubscriber, HeroConfig, HowItWorksConfig, HomepageConfig, PharmacyOwner, Review } from '@/types';

type AdminTab = 'dashboard' | 'orders' | 'prescriptions' | 'pharmacies' | 'products' | 'categories' | 'discounts' | 'coupons' | 'reviews' | 'customers' | 'subscribers' | 'stockAlerts' | 'loyalty' | 'settings';

export function AdminPage() {
  const { settings } = useSettings();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminDark, setAdminDark] = useState(() => localStorage.getItem('pharmacy-admin-dark-mode') === '1');

  useEffect(() => {
    localStorage.setItem('pharmacy-admin-dark-mode', adminDark ? '1' : '0');
  }, [adminDark]);

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" /> },
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
      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar drawer */}
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

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top bar */}
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
          {activeTab === 'subscribers' && <SubscribersTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}

// ============================================
// Prescriptions Tab
// ============================================
function PrescriptionsTab() {
  const { settings } = useSettings();
  const [list, setList] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | (typeof PRESCRIPTION_STATUSES)[number]>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchRx = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*, customer:customers(full_name, phone)')
      .order('created_at', { ascending: false });
    setList((data || []) as Prescription[]);
    if (error) showToast(translateError(error.message).ar);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRx();
  }, [fetchRx]);

  const counts = useCallback(
    (status: 'all' | (typeof PRESCRIPTION_STATUSES)[number]) => {
      if (status === 'all') return list.length;
      return list.filter((r) => r.status === status).length;
    },
    [list]
  );

  const filtered = filter === 'all' ? list : list.filter((r) => r.status === filter);

  const updateStatus = async (rx: Prescription, status: (typeof PRESCRIPTION_STATUSES)[number]) => {
    const { error } = await supabase.from('prescriptions').update({ status }).eq('id', rx.id);
    if (error) {
      showToast(translateError(error.message).ar);
    } else {
      showToast('تم تحديث حالة الروشتة بنجاح');
      if (rx.customer_id) {
        try {
          await insertNotification({
            customerId: rx.customer_id,
            type: 'prescription',
            title: 'تحديث حالة الروشتة',
            body: `حالة روشتك الآن: ${PRESCRIPTION_STATUS_META[status].label}`,
          });
        } catch {
          // notification failure shouldn't block the status update
        }
      }
      fetchRx();
    }
  };

  const handleDelete = async (rx: Prescription) => {
    if (!confirm('حذف هذه الروشتة نهائياً؟')) return;
    try {
      await deletePrescription(rx.id, rx.image_url);
      showToast('تم حذف الروشتة');
      fetchRx();
    } catch (err) {
      showToast(translateError((err as { message?: string })?.message || '').ar || 'فشل الحذف');
    }
  };

  const filterTabs = [
    { id: 'all' as const, label: 'الكل' },
    ...PRESCRIPTION_STATUSES.map((s) => ({ id: s, label: PRESCRIPTION_STATUS_META[s].label })),
  ];

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl animate-fade-in flex items-center gap-2">
          <Check className="w-4 h-4 text-teal-400" />
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900">الروشتات الواردة</h2>
          <p className="text-xs text-gray-500 mt-0.5">الروشتات الطبية المرفوعة من العملاء - راجعها وغير حالتها أو تواصل مع العميل</p>
        </div>
        <button
          onClick={fetchRx}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Loader2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Filter tabs */}
      <div className="p-1.5 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto scrollbar-none flex items-center gap-1.5">
        {filterTabs.map((t) => {
          const isActive = filter === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`flex-1 min-w-[110px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
                isActive ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-slate-50'
              }`}
              style={isActive ? { backgroundColor: settings.primary_color } : {}}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : PRESCRIPTION_STATUS_META[t.id as keyof typeof PRESCRIPTION_STATUS_META]?.dot || 'bg-gray-300'}`} />
              {t.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                {counts(t.id)}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-100 rounded-3xl h-72 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${settings.primary_color}12` }}
          >
            <FileText className="w-8 h-8" style={{ color: settings.primary_color }} />
          </div>
          <h3 className="font-black text-gray-900 text-base mb-1">لا توجد روشتات في هذا التصنيف</h3>
          <p className="text-sm text-gray-500">عندما يرفع العميل روشتة طبية ستظهر هنا فوراً للمراجعة والمعالجة.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rx) => {
            const meta = PRESCRIPTION_STATUS_META[rx.status] || PRESCRIPTION_STATUS_META.new;
            const isOpen = expanded === rx.id;
            return (
              <div key={rx.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="h-44 bg-slate-900 relative flex items-center justify-center cursor-pointer" onClick={() => setExpanded(isOpen ? null : rx.id)}>
                  <PrivateImage
                    bucket="prescriptions"
                    src={rx.image_url}
                    alt="روشتة"
                    className={`max-h-44 w-auto object-contain transition-opacity ${isOpen ? 'opacity-100' : 'opacity-90'}`}
                  />
                  <span className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${meta.className}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold border border-white/20">
                    <Clock className="w-3 h-3" />
                    {new Date(rx.created_at).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                      {rx.customer?.full_name ? (
                        <>
                          <User className="w-4 h-4 text-teal-600" />
                          {rx.customer.full_name}
                        </>
                      ) : (
                        <span className="text-gray-400">عميل غير مسجل</span>
                      )}
                    </p>
                    <span className="text-[10px] text-gray-400 font-bold">#{rx.id.slice(0, 8)}</span>
                  </div>

                  <a href={`tel:${rx.phone}`} className="flex items-center gap-1.5 text-xs text-gray-600 font-bold hover:text-teal-700 transition-colors" dir="ltr">
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    {rx.phone}
                  </a>

                  {rx.notes && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-2.5 leading-relaxed line-clamp-2">
                      {rx.notes}
                    </p>
                  )}

                  {/* Status changer */}
                  <div className="pt-1">
                    <p className="text-[10px] font-black text-gray-400 mb-1.5">تغيير الحالة:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESCRIPTION_STATUSES.map((s) => {
                        const m = PRESCRIPTION_STATUS_META[s];
                        const active = rx.status === s;
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatus(rx, s)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all active:scale-95 ${
                              active ? `${m.className} shadow-sm scale-105` : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100">
                    {rx.phone && (
                      <a
                        href={buildWhatsAppLink(rx.phone, 'مرحباً، تم استلام روشتتك وسيتم التواصل معك قريباً')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-teal-500 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        واتساب
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(rx)}
                      className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                      title="حذف الروشتة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// Orders Tab
// ============================================
interface OrderRecord {
  id: string;
  product_id: string;
  pharmacy_id: string;
  quantity: number;
  total_price: number;
  address: string | null;
  note: string | null;
  status: string;
  payment_method: string | null;
  payment_number: string | null;
  payment_screenshot_url: string | null;
  created_at: string;
  customer_id: string | null;
  order_group_id: string | null;
  product?: Product;
  pharmacy?: Pharmacy;
  customer?: { full_name: string | null; phone: string | null } | null;
}

interface OrderGroupRecord {
  id: string;
  customer_id: string | null;
  address: string | null;
  note: string | null;
  status: string;
  payment_method: string | null;
  payment_number: string | null;
  payment_screenshot_url: string | null;
  delivery_fee: number;
  total_price: number;
  created_at: string;
}

interface GroupView {
  key: string;
  group: OrderGroupRecord | null;
  orders: OrderRecord[];
  status: string;
  created_at: string;
  customer_id: string | null;
  address: string | null;
  note: string | null;
  payment_method: string | null;
  payment_number: string | null;
  payment_screenshot_url: string | null;
  total: number;
}

export function OrdersTab({ pharmacyId }: { pharmacyId?: string }) {
  const { settings } = useSettings();
  const [list, setList] = useState<OrderRecord[]>([]);
  const [groups, setGroups] = useState<OrderGroupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | (typeof ORDER_STATUSES)[number]>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [invoiceView, setInvoiceView] = useState<GroupView | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, product:products(*), pharmacy:pharmacies(*), customer:customers(full_name, phone)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (pharmacyId) query = query.eq('pharmacy_id', pharmacyId);
    const { data, error } = await query;
    setList((data || []) as OrderRecord[]);
    if (error) showToast(translateError(error.message).ar);
    const { data: gData } = await supabase
      .from('order_groups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setGroups((gData || []) as OrderGroupRecord[]);
    setLoading(false);
  }, [pharmacyId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const views = useMemo<GroupView[]>(() => {
    const grouped = new Map<string, OrderRecord[]>();
    const standalone: OrderRecord[] = [];
    list.forEach((o) => {
      if (o.order_group_id) {
        const arr = grouped.get(o.order_group_id) || [];
        arr.push(o);
        grouped.set(o.order_group_id, arr);
      } else {
        standalone.push(o);
      }
    });
    const result: GroupView[] = [];
    grouped.forEach((orders, gid) => {
      const grp = groups.find((g) => g.id === gid) || null;
      const first = orders[0];
      result.push({
        key: gid,
        group: grp,
        orders,
        status: grp?.status || first?.status || 'pending',
        created_at: grp?.created_at || first?.created_at || '',
        customer_id: first?.customer_id || null,
        address: grp?.address ?? first?.address ?? null,
        note: grp?.note ?? first?.note ?? null,
        payment_method: grp?.payment_method ?? first?.payment_method ?? null,
        payment_number: grp?.payment_number ?? first?.payment_number ?? null,
        payment_screenshot_url: grp?.payment_screenshot_url ?? first?.payment_screenshot_url ?? null,
        total: grp ? Number(grp.total_price || 0) : orders.reduce((s, o) => s + Number(o.total_price || 0), 0),
      });
    });
    standalone.forEach((o) => {
      result.push({
        key: o.id,
        group: null,
        orders: [o],
        status: o.status,
        created_at: o.created_at,
        customer_id: o.customer_id,
        address: o.address,
        note: o.note,
        payment_method: o.payment_method,
        payment_number: o.payment_number,
        payment_screenshot_url: o.payment_screenshot_url,
        total: Number(o.total_price || 0),
      });
    });
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [list, groups]);

  const counts = useCallback(
    (status: string) => views.filter((v) => v.status === status).length,
    [views]
  );

  const updateStatus = async (view: GroupView, status: string) => {
    setUpdatingId(view.key);
    const now = new Date().toISOString();
    const scopedOrders = pharmacyId ? view.orders.filter((o) => o.pharmacy_id === pharmacyId) : view.orders;
    if (scopedOrders.length === 0) {
      setUpdatingId(null);
      return;
    }
    const ids = scopedOrders.map((o) => o.id);
    const errors: string[] = [];
    if (view.group && !pharmacyId) {
      const { error } = await supabase
        .from('order_groups')
        .update({ status, updated_at: now })
        .eq('id', view.group.id);
      if (error) errors.push(error.message);
    }
    if (ids.length > 0) {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: now })
        .in('id', ids);
      if (error) errors.push(error.message);
    }
    setUpdatingId(null);
    if (errors.length > 0) {
      showToast(translateError(errors[0]).ar);
    } else {
      await fetchOrders();
      const first = scopedOrders[0];
      if (first?.customer_id) {
        const meta = ORDER_STATUS_META[(status as (typeof ORDER_STATUSES)[number])] || ORDER_STATUS_META.pending;
        const isScopedGroup = scopedOrders.length > 1 || !!view.group;
        await insertNotification({
          customerId: first.customer_id,
          type: 'order',
          title: isScopedGroup ? `تحديث حالة طلبك الموحد: ${meta.label}` : `تحديث حالة طلبك: ${meta.label}`,
          body: first.product?.name
            ? `طلبك "${first.product.name}" أصبح ${meta.label}`
            : `حالة طلبك أصبحت: ${meta.label}`,
        });
      }
      showToast('تم تحديث حالة الطلب بنجاح');
    }
  };

  const filtered = filter === 'all' ? views : views.filter((v) => v.status === filter);

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-2xl font-black text-gray-900">{views.length}</p>
          <p className="text-xs font-bold text-gray-500 mt-1">إجمالي الطلبات</p>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
          <p className="text-2xl font-black text-amber-700">{counts('pending')}</p>
          <p className="text-xs font-bold text-amber-600 mt-1">بانتظار تأكيد الدفع</p>
        </div>
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4">
          <p className="text-2xl font-black text-blue-700">{counts('confirmed') + counts('shipped')}</p>
          <p className="text-xs font-bold text-blue-600 mt-1">قيد التوصيل</p>
        </div>
        <div className="bg-teal-50 rounded-2xl border border-teal-200 p-4">
          <p className="text-2xl font-black text-teal-700">{counts('delivered')}</p>
          <p className="text-xs font-bold text-teal-600 mt-1">تم التسليم</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold border whitespace-nowrap transition-all ${
            filter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
          }`}
        >
          الكل ({views.length})
        </button>
        {ORDER_STATUSES.map((s) => {
          const m = ORDER_STATUS_META[s];
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold border whitespace-nowrap transition-all ${
                filter === s ? `${m.className} shadow-sm` : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {m.label} ({counts(s)})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${settings.primary_color}12` }}
          >
            <ShoppingCart className="w-8 h-8" style={{ color: settings.primary_color }} />
          </div>
          <h3 className="font-black text-gray-900 text-base mb-1">لا توجد طلبات</h3>
          <p className="text-sm text-gray-500">ستظهر طلبات العملاء هنا عند تسجيل أي طلب جديد.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((view) => {
            const order = view.orders[0];
            const isGroup = view.orders.length > 1 || !!view.group;
            const m = ORDER_STATUS_META[(view.status as (typeof ORDER_STATUSES)[number])] || ORDER_STATUS_META.pending;
            const paymentLabel =
              view.payment_method === 'instapay'
                ? 'انستا باي'
                : view.payment_method === 'vodafone_cash'
                  ? 'فودافون كاش'
                  : null;
            const pharmacyCount = new Set(view.orders.map((o) => o.pharmacy?.name).filter(Boolean)).size;
            const subtotal = view.orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
            const deliveryFee = view.group ? Number(view.group.delivery_fee || 0) : 0;
            return (
              <div key={view.key} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isGroup && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border border-gray-200 bg-gray-50 text-gray-600">
                        <Layers className="w-3 h-3" />
                        طلب موحد
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold border ${m.className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                      {m.label}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400">
                      {view.orders.length} {isGroup ? `منتج من ${pharmacyCount} صيدليات` : 'منتج'}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400">
                      {new Date(view.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-400" dir="ltr">#{view.key.slice(0, 8)}</span>
                </div>

                {/* Products (one or more, from multiple pharmacies) */}
                <div className="space-y-2">
                  {view.orders.map((o) => {
                    const unitPrice = Number(o.total_price / o.quantity).toFixed(2);
                    return (
                      <div key={o.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                        <div className="w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-white border border-gray-100 flex items-center justify-center">
                          {o.product?.image_url ? (
                            <img src={o.product.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-gray-900 text-xs truncate">{o.product?.name || 'منتج'}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                            <Store className="w-3 h-3 shrink-0" />
                            <span className="truncate">{o.pharmacy?.name || 'صيدلية'}</span>
                          </p>
                        </div>
                        <div className="shrink-0 text-left">
                          <p className="text-xs font-black" style={{ color: settings.primary_color }}>
                            {Number(o.total_price).toFixed(2)} ج.م
                          </p>
                          <p className="text-[10px] text-gray-400">الكمية {o.quantity} × {unitPrice}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                  {/* Customer + payment */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: settings.primary_color }}
                      >
                        {(order.customer?.full_name || 'ع').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-900 truncate">{order.customer?.full_name || 'عميل'}</p>
                        {order.customer?.phone && (
                          <p className="text-[11px] text-gray-500" dir="ltr">{order.customer.phone}</p>
                        )}
                      </div>
                    </div>

                    {paymentLabel ? (
                      <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                            <Wallet className="w-3.5 h-3.5" style={{ color: settings.primary_color }} />
                            الدفع: {paymentLabel}
                          </p>
                          {view.payment_screenshot_url && (
                            <PrivateLink
                              bucket="payments"
                              href={view.payment_screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="عرض إثبات التحويل"
                              className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-1 rounded-lg text-white hover:brightness-110 transition-all"
                              style={{ backgroundColor: settings.primary_color }}
                            >
                              <ImageIcon className="w-3 h-3" />
                              إثبات التحويل
                            </PrivateLink>
                          )}
                        </div>
                        {view.payment_number && (
                          <p className="text-[11px] font-black text-gray-800 mt-1" dir="ltr">
                            {view.payment_number}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                        <p className="text-[11px] font-bold text-gray-500">لم يتم تحديد طريقة دفع</p>
                      </div>
                    )}
                  </div>

                  {/* Delivery info */}
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-[11px] font-bold text-gray-600 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                      <span className="truncate">{view.address || 'عنوان التوصيل غير محدد'}</span>
                    </p>
                    {view.note && (
                      <p className="text-[11px] font-bold text-gray-600 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                        <span className="truncate">{view.note}</span>
                      </p>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
                      <span>المجموع الفرعي</span>
                      <span className="text-gray-700">{subtotal.toFixed(2)} ج.م</span>
                    </div>
                    {isGroup && (
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3" /> رسوم التوصيل
                        </span>
                        <span className="text-gray-700">{deliveryFee.toFixed(2)} ج.م</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-xs text-gray-400 font-bold">الإجمالي</span>
                      <span className="font-black text-base" style={{ color: settings.primary_color }}>
                        {Number(view.total).toFixed(2)} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[10px] font-black text-gray-400 ml-1">تحديث الحالة:</span>
                  {ORDER_STATUSES.map((s) => {
                    const sm = ORDER_STATUS_META[s];
                    const active = view.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(view, s)}
                        disabled={updatingId === view.key}
                        className={`px-2.5 py-1.5 rounded-full text-[10px] font-extrabold border transition-all active:scale-95 disabled:opacity-50 ${
                          active ? `${sm.className} shadow-sm scale-105` : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {sm.label}
                      </button>
                    );
                  })}
                  {order.customer?.phone && (
                    <a
                      href={buildWhatsAppLink(order.customer.phone, 'مرحباً، بخصوص طلبك في صيدليتي')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mr-auto flex items-center gap-1.5 py-2 px-4 rounded-xl bg-teal-500 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      واتساب العميل
                    </a>
                  )}
                  <button
                    onClick={() => setInvoiceView(view)}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-xl border text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all"
                    style={{ color: settings.primary_color, borderColor: `${settings.primary_color}33`, backgroundColor: `${settings.primary_color}0d` }}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    فاتورة العميل
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {invoiceView && (
        <InvoiceModal
          open
          order={{
            id: invoiceView.key,
            status: invoiceView.status,
            created_at: invoiceView.created_at,
            customer: invoiceView.orders[0]?.customer
              ? { full_name: invoiceView.orders[0].customer.full_name, phone: invoiceView.orders[0].customer.phone }
              : null,
            address: invoiceView.address,
            note: invoiceView.note,
            payment_method: invoiceView.payment_method,
            payment_number: invoiceView.payment_number,
            delivery_fee: invoiceView.group ? Number(invoiceView.group.delivery_fee || 0) : 0,
            total: invoiceView.total,
            orders: invoiceView.orders,
          }}
          settings={settings}
          onClose={() => setInvoiceView(null)}
        />
      )}
    </div>
  );
}

// ============================================
// Dashboard Tab
// ============================================
function DashboardTab() {
  const { settings, storeConfig, welcomeConfig, refresh } = useSettings();
  const [togglingPurchases, setTogglingPurchases] = useState(false);
  const [togglingCatalogMultiPharmacy, setTogglingCatalogMultiPharmacy] = useState(false);
  const [stats, setStats] = useState({ pharmacies: 0, products: 0, categories: 0, discounts: 0, coupons: 0, customers: 0, orders: 0, revenue: 0, stockAlerts: 0, loyaltyPoints: 0 });
  const [recentPharmacies, setRecentPharmacies] = useState<Pharmacy[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; count: number; revenue: number }[]>([]);
  const [weekChart, setWeekChart] = useState<{ day: string; count: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [p, pr, c, d, cp, cu, orders, alerts, loyalty] = await Promise.all([
        supabase.from('pharmacies').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('discounts').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('coupons').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('product_id, total_price, status, created_at, product:products(name)').order('created_at', { ascending: false }).limit(500),
        supabase.from('stock_alerts').select('*', { count: 'exact', head: true }),
        supabase.from('loyalty_transactions').select('points', { count: 'exact', head: true }).gt('points', 0),
      ]);
      const ordersData = (orders.data || []) as { product_id: string; total_price: number; status: string; created_at: string; product?: { name: string }[] }[];
      const active = ordersData.filter((o) => o.status !== 'cancelled');
      const revenue = active.reduce((sum, o) => sum + (o.total_price || 0), 0);
      setStats({
        pharmacies: p.count || 0,
        products: pr.count || 0,
        categories: c.count || 0,
        discounts: d.count || 0,
        coupons: cp.count || 0,
        customers: cu.count || 0,
        orders: ordersData.length,
        revenue,
        stockAlerts: alerts.count || 0,
        loyaltyPoints: loyalty.count || 0,
      });

      const { data: recentP } = await supabase.from('pharmacies').select('*').order('created_at', { ascending: false }).limit(3);
      setRecentPharmacies((recentP || []) as Pharmacy[]);
      const { data: recentPr } = await supabase.from('products').select('*, pharmacy:pharmacies(name)').order('created_at', { ascending: false }).limit(5);
      setRecentProducts((recentPr || []) as Product[]);

      const byProduct: Record<string, { name: string; count: number; revenue: number }> = {};
      active.forEach((o) => {
        if (!byProduct[o.product_id]) byProduct[o.product_id] = { name: (o.product && o.product[0]?.name) || 'منتج محذوف', count: 0, revenue: 0 };
        byProduct[o.product_id].count += 1;
        byProduct[o.product_id].revenue += o.total_price || 0;
      });
      setTopProducts(Object.values(byProduct).sort((a, b) => b.count - a.count).slice(0, 5));

      const days: { day: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        const count = ordersData.filter((o) => { const t = new Date(o.created_at).getTime(); return t >= start.getTime() && t <= end.getTime(); }).length;
        days.push({ day: d.toLocaleDateString('ar-EG', { weekday: 'short' }), count });
      }
      setWeekChart(days);
    };
    fetch();
  }, []);

  const [catalogWhatsappInput, setCatalogWhatsappInput] = useState('');
  const [savingCatalogWhatsapp, setSavingCatalogWhatsapp] = useState(false);

  useEffect(() => {
    setCatalogWhatsappInput(storeConfig.catalogWhatsapp || '');
  }, [storeConfig.catalogWhatsapp]);

  const handleSaveCatalogWhatsapp = async () => {
    if (savingCatalogWhatsapp) return;
    setSavingCatalogWhatsapp(true);
    try {
      const parsed = settings.features_json ? JSON.parse(settings.features_json) : {};
      const next = {
        ...parsed,
        storeConfig: { ...storeConfig, catalogWhatsapp: catalogWhatsappInput.trim() },
      };
      await supabase.from('site_settings').update({
        features_json: JSON.stringify(next),
        updated_at: new Date().toISOString(),
      }).eq('id', settings.id);
      await refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingCatalogWhatsapp(false);
    }
  };

  const handleTogglePurchases = async () => {
    if (togglingPurchases) return;
    setTogglingPurchases(true);
    try {
      const parsed = settings.features_json ? JSON.parse(settings.features_json) : {};
      const next = {
        ...parsed,
        storeConfig: { ...storeConfig, purchasesEnabled: !storeConfig.purchasesEnabled },
      };
      await supabase.from('site_settings').update({
        features_json: JSON.stringify(next),
        updated_at: new Date().toISOString(),
      }).eq('id', settings.id);
      await refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingPurchases(false);
    }
  };

  const handleToggleCatalogMultiPharmacy = async () => {
    if (togglingCatalogMultiPharmacy) return;
    setTogglingCatalogMultiPharmacy(true);
    try {
      const parsed = settings.features_json ? JSON.parse(settings.features_json) : {};
      const next = {
        ...parsed,
        storeConfig: { ...storeConfig, catalogMultiPharmacy: !storeConfig.catalogMultiPharmacy },
      };
      await supabase.from('site_settings').update({
        features_json: JSON.stringify(next),
        updated_at: new Date().toISOString(),
      }).eq('id', settings.id);
      await refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingCatalogMultiPharmacy(false);
    }
  };

  const [welcomeForm, setWelcomeForm] = useState<WelcomePopupConfig>({ ...welcomeConfig });
  const [savingWelcome, setSavingWelcome] = useState(false);
  const [welcomeSavedMsg, setWelcomeSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setWelcomeForm({ ...welcomeConfig });
  }, [welcomeConfig]);

  const setWelcomeField = <K extends keyof WelcomePopupConfig>(key: K, value: WelcomePopupConfig[K]) => {
    setWelcomeForm((f) => ({ ...f, [key]: value }));
  };

  const handleSaveWelcome = async () => {
    if (savingWelcome) return;
    setSavingWelcome(true);
    setWelcomeSavedMsg(null);
    try {
      const parsed = settings.features_json ? JSON.parse(settings.features_json) : {};
      const next = {
        ...parsed,
        welcomeConfig: {
          ...welcomeForm,
          discountPercent: Math.max(0, Math.min(100, Number(welcomeForm.discountPercent) || 0)),
          delaySeconds: Math.max(0, Math.min(60, Number(welcomeForm.delaySeconds) || 0)),
        },
      };
      await supabase.from('site_settings').update({
        features_json: JSON.stringify(next),
        updated_at: new Date().toISOString(),
      }).eq('id', settings.id);
      await refresh();
      setWelcomeSavedMsg('تم حفظ إعدادات الرسالة الترحيبية');
      setTimeout(() => setWelcomeSavedMsg(null), 2500);
    } catch (e) {
      console.error(e);
      setWelcomeSavedMsg('حدث خطأ أثناء الحفظ');
    } finally {
      setSavingWelcome(false);
    }
  };

  const cards = [
    { label: 'إجمالي المبيعات', value: `${stats.revenue.toFixed(0)} ج.م`, icon: <Wallet />, color: settings.primary_color },
    { label: 'الطلبات', value: stats.orders, icon: <ShoppingCart />, color: settings.secondary_color },
    { label: 'الصيدليات', value: stats.pharmacies, icon: <Store />, color: settings.primary_color },
    { label: 'المنتجات', value: stats.products, icon: <Package />, color: settings.secondary_color },
    { label: 'الفئات', value: stats.categories, icon: <List />, color: settings.accent_color },
    { label: 'الخصومات النشطة', value: stats.discounts, icon: <TrendingDown />, color: '#ef4444' },
    { label: 'أكواد الخصم', value: stats.coupons, icon: <Ticket />, color: '#8b5cf6' },
    { label: 'العملاء', value: stats.customers, icon: <Users />, color: '#0ea5e9' },
    { label: 'تنبيهات التوفر', value: stats.stockAlerts, icon: <BellRing />, color: '#f59e0b' },
    { label: 'حركات النقاط', value: stats.loyaltyPoints, icon: <Sparkles />, color: '#d97706' },
  ];

  const maxWeek = Math.max(1, ...weekChart.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})` }}>
        <div className="relative z-10">
          <h2 className="text-xl font-bold mb-1">مرحباً بك في لوحة التحكم</h2>
          <p className="text-white/80 text-sm">من هنا يمكنك إدارة كل ما يخص {settings.site_name}</p>
        </div>
        <div className="absolute -bottom-8 -left-8 opacity-20">
          <Cross className="w-40 h-40" strokeWidth={1} />
        </div>
      </div>

      {/* Store purchases toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${storeConfig.purchasesEnabled ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600'}`}
        >
          {storeConfig.purchasesEnabled ? <ShoppingCart className="w-7 h-7" /> : <Ban className="w-7 h-7" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base">
            {storeConfig.purchasesEnabled ? 'الشراء أونلاين مفعّل' : 'الشراء أونلاين متوقف'}
          </h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {storeConfig.purchasesEnabled
              ? 'يمكن للعملاء طلب المنتجات والدفع أونلاين مع خدمة التوصيل.'
              : 'يتم عرض المنتجات فقط، ويطلب من العملاء التواصل مع الصيدلية مباشرة للشراء (بدون طلب أونلاين).'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleTogglePurchases}
          disabled={togglingPurchases}
          className={`relative w-16 h-9 rounded-full transition-colors duration-300 shrink-0 disabled:opacity-60 ${storeConfig.purchasesEnabled ? 'bg-teal-600' : 'bg-red-500'}`}
          aria-pressed={storeConfig.purchasesEnabled}
        >
          <span
            className={`absolute top-1 w-7 h-7 rounded-full bg-white shadow transition-all duration-300 ${storeConfig.purchasesEnabled ? 'right-1' : 'right-8'}`}
          />
          {togglingPurchases && <Loader2 className="absolute inset-0 m-auto w-4 h-4 text-white animate-spin" />}
        </button>
      </div>

      {/* Catalog cart pharmacies policy */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${storeConfig.catalogMultiPharmacy ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}
        >
          <Store className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base">
            {storeConfig.catalogMultiPharmacy ? 'السلة تقبل من كل الصيدليات' : 'السلة تقبل من صيدلية واحدة فقط'}
          </h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            عند إيقاف الشراء أونلاين، حدّد هل يقبل العملاء إضافة منتجات من كل الصيدليات في سلة واحدة، أم من صيدلية واحدة فقط.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleCatalogMultiPharmacy}
          disabled={togglingCatalogMultiPharmacy}
          className={`relative w-16 h-9 rounded-full transition-colors duration-300 shrink-0 disabled:opacity-60 ${storeConfig.catalogMultiPharmacy ? 'bg-indigo-600' : 'bg-gray-300'}`}
          aria-pressed={storeConfig.catalogMultiPharmacy}
        >
          <span
            className={`absolute top-1 w-7 h-7 rounded-full bg-white shadow transition-all duration-300 ${storeConfig.catalogMultiPharmacy ? 'right-1' : 'right-8'}`}
          />
          {togglingCatalogMultiPharmacy && <Loader2 className="absolute inset-0 m-auto w-4 h-4 text-white animate-spin" />}
        </button>
      </div>

      {/* Catalog WhatsApp number */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-green-50 text-green-600">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base">رقم واتساب طلبات المعاينة (الكطلوج)</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              الرقم الذي يُرسل إليه زر «إرسال الفاتورة واتساب» داخل السلة عند إيقاف الشراء أونلاين. اتركه فارغاً ليتم استخدام رقم الصيدلية ثم رقم تواصل المنصة.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <input
            type="tel"
            dir="ltr"
            value={catalogWhatsappInput}
            onChange={(e) => setCatalogWhatsappInput(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
          />
          <button
            type="button"
            onClick={handleSaveCatalogWhatsapp}
            disabled={savingCatalogWhatsapp}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {savingCatalogWhatsapp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ
          </button>
        </div>
      </div>

      {/* Welcome popup config */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${welcomeForm.enabled ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
            <BadgePercent className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base">
              {welcomeForm.enabled ? 'الرسالة الترحيبية مفعّلة' : 'الرسالة الترحيبية متوقفة'}
            </h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              نافذة الترحيب التي تظهر للعملاء مع كود الخصم عند فتح الموقع. يمكنك التحكم في النصوص ونسبة الخصم والكود.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWelcomeField('enabled', !welcomeForm.enabled)}
            className={`relative w-16 h-9 rounded-full transition-colors duration-300 shrink-0 ${welcomeForm.enabled ? 'bg-amber-500' : 'bg-gray-300'}`}
            aria-pressed={welcomeForm.enabled}
          >
            <span
              className={`absolute top-1 w-7 h-7 rounded-full bg-white shadow transition-all duration-300 ${welcomeForm.enabled ? 'right-1' : 'right-8'}`}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <label className="block">
            <span className="text-xs font-bold text-gray-600">كود الخصم (يظهر للعميل)</span>
            <input
              dir="ltr"
              value={welcomeForm.offerCode}
              onChange={(e) => setWelcomeField('offerCode', e.target.value.toUpperCase())}
              placeholder="WELCOME10"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-black tracking-widest text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-gray-600">نسبة الخصم %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={welcomeForm.discountPercent}
                onChange={(e) => setWelcomeField('discountPercent', Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-600">الظهور بعد (ثانية)</span>
              <input
                type="number"
                min={0}
                max={60}
                value={welcomeForm.delaySeconds}
                onChange={(e) => setWelcomeField('delaySeconds', Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
              />
            </label>
          </div>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-gray-600">العنوان الرئيسي (اكتب {`{percent}`} لعرض النسبة تلقائياً)</span>
            <input
              value={welcomeForm.title}
              onChange={(e) => setWelcomeField('title', e.target.value)}
              placeholder="خصم {percent}% على طلبك الأول"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">العنوان الرئيسي (English — استخدم {`{percent}`} للنسبة)</span>
            <input
              value={welcomeForm.title_en || ''}
              onChange={(e) => setWelcomeField('title_en', e.target.value)}
              placeholder="Get {percent}% off your first order"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
              dir="ltr"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">النص الفرعي</span>
            <input
              value={welcomeForm.subtitle}
              onChange={(e) => setWelcomeField('subtitle', e.target.value)}
              placeholder="ادخل الكود عند إتمام الطلب واستفد بالخصم"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">النص الفرعي (English)</span>
            <input
              value={welcomeForm.subtitle_en || ''}
              onChange={(e) => setWelcomeField('subtitle_en', e.target.value)}
              placeholder="Use the code at checkout to get your discount"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
              dir="ltr"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">نص الشارة العلوية</span>
            <input
              value={welcomeForm.badgeText}
              onChange={(e) => setWelcomeField('badgeText', e.target.value)}
              placeholder="عرض ترحيبي خاص"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">نص الشارة العلوية (English)</span>
            <input
              value={welcomeForm.badgeText_en || ''}
              onChange={(e) => setWelcomeField('badgeText_en', e.target.value)}
              placeholder="Special welcome offer"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
              dir="ltr"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">نص زر «ابدأ التسوق»</span>
            <input
              value={welcomeForm.ctaText}
              onChange={(e) => setWelcomeField('ctaText', e.target.value)}
              placeholder="ابدأ التسوق الآن"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">نص زر «ابدأ التسوق» (English)</span>
            <input
              value={welcomeForm.ctaText_en || ''}
              onChange={(e) => setWelcomeField('ctaText_en', e.target.value)}
              placeholder="Start shopping now"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
              dir="ltr"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">نص «لاحقاً»</span>
            <input
              value={welcomeForm.laterText}
              onChange={(e) => setWelcomeField('laterText', e.target.value)}
              placeholder="لاحقاً، لن أشتري الآن"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">نص «لاحقاً» (English)</span>
            <input
              value={welcomeForm.laterText_en || ''}
              onChange={(e) => setWelcomeField('laterText_en', e.target.value)}
              placeholder="Later, maybe next time"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
              dir="ltr"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={welcomeForm.showCountdown}
              onChange={(e) => setWelcomeField('showCountdown', e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            <span className="text-xs font-bold text-gray-600">عرض العد التنازلي لنهاية اليوم</span>
          </label>
          <div className="flex items-center gap-3">
            {welcomeSavedMsg && <span className="text-xs font-bold text-green-600">{welcomeSavedMsg}</span>}
            <button
              type="button"
              onClick={handleSaveWelcome}
              disabled={savingWelcome}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 text-white px-5 py-2.5 text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-60"
            >
              {savingWelcome ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ الإعدادات
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${card.color}15` }}>
              <span style={{ color: card.color }} className="[&>svg]:w-6 [&>svg]:h-6">{card.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Last 7 days chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-400" />
            <h3 className="font-bold text-gray-900">الطلبات آخر 7 أيام</h3>
          </div>
          <div className="flex items-end gap-3 h-40">
            {weekChart.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold text-gray-600">{d.count}</span>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max(6, (d.count / maxWeek) * 100)}%`,
                    backgroundColor: i === weekChart.length - 1 ? settings.primary_color : `${settings.primary_color}40`
                  }}
                />
                <span className="text-[10px] text-gray-400">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-gray-400" />
            <h3 className="font-bold text-gray-900">الأعلى مبيعاً</h3>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">لا توجد طلبات بعد لعرض الأعلى مبيعاً</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black" style={{ backgroundColor: `${settings.primary_color}15`, color: settings.primary_color }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-[11px] text-gray-400">{p.count} طلب • {p.revenue.toFixed(0)} ج.م</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent pharmacies */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-400" />
            <h3 className="font-bold text-gray-900">أحدث الصيدليات</h3>
          </div>
          <div className="space-y-3">
            {recentPharmacies.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm" style={{ backgroundColor: settings.primary_color }}>
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.area || p.address}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.is_active ? 'نشطة' : 'متوقفة'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent products */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-gray-400" />
            <h3 className="font-bold text-gray-900">أحدث المنتجات</h3>
          </div>
          <div className="space-y-3">
            {recentProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{(p as Product & { pharmacy?: { name: string } }).pharmacy?.name}</p>
                </div>
                <span className="text-sm font-semibold" style={{ color: settings.primary_color }}>{p.price.toFixed(0)} ج.م</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Pharmacies Tab
// ============================================
function PharmaciesTab() {
  const { settings } = useSettings();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Pharmacy | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [sections, setSections] = useState<Record<string, string[]>>({});
  const [ownersMap, setOwnersMap] = useState<Record<string, PharmacyOwner>>({});
  const [ownerModal, setOwnerModal] = useState<Pharmacy | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchPharmacies = useCallback(async () => {
    setLoading(true);
    const [pharmRes, sectionsRes, ownersRes] = await Promise.all([
      supabase.from('pharmacies').select('*').order('created_at', { ascending: false }),
      supabase.from('pharmacy_sections').select('pharmacy_id, section_key'),
      supabase.from('pharmacy_owners').select('*'),
    ]);
    setPharmacies((pharmRes.data || []) as Pharmacy[]);

    if (!sectionsRes.error) {
      const map: Record<string, string[]> = {};
      (sectionsRes.data || []).forEach((row) => {
        if (!map[row.section_key]) map[row.section_key] = [];
        if (!map[row.section_key].includes(row.pharmacy_id)) {
          map[row.section_key].push(row.pharmacy_id);
        }
      });
      setSections(map);
    }
    const owners: Record<string, PharmacyOwner> = {};
    if (!ownersRes.error) {
      (ownersRes.data || []).forEach((row) => {
        owners[(row as PharmacyOwner).pharmacy_id] = row as PharmacyOwner;
      });
    }
    setOwnersMap(owners);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPharmacies(); }, [fetchPharmacies]);

  const toggleSection = async (pharmacyId: string, key: PharmacySectionKey) => {
    setSavingKey(`${pharmacyId}:${key}`);
    const isMember = (sections[key] || []).includes(pharmacyId);
    if (isMember) {
      await supabase.from('pharmacy_sections').delete().eq('pharmacy_id', pharmacyId).eq('section_key', key);
      setSections((prev) => ({ ...prev, [key]: (prev[key] || []).filter((id) => id !== pharmacyId) }));
      showToast('تمت إزالة الصيدلية من القسم بنجاح');
    } else {
      await supabase.from('pharmacy_sections').insert({ pharmacy_id: pharmacyId, section_key: key });
      setSections((prev) => ({ ...prev, [key]: [...(prev[key] || []), pharmacyId] }));
      showToast('تمت إضافة الصيدلية للقسم بنجاح');
    }
    setSavingKey(null);
  };

  const filtered = pharmacies.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.area?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصيدلية؟ سيتم حذف جميع منتجاتها أيضاً.')) return;
    await supabase.from('pharmacies').delete().eq('id', id);
    fetchPharmacies();
  };

  const copyOwnerLink = async (pharmacyName: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/admin/pharmacy`);
      showToast(`تم نسخ رابط إدارة "${pharmacyName}"`);
    } catch {
      showToast('تعذر النسخ التلقائي، انسخ الرابط من نافذة الحساب');
    }
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
        <div className="relative w-full sm:max-w-xs">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث عن صيدلية..." className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm" style={{ ['--tw-ring-color' as string]: settings.primary_color }} />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-transform hover:scale-105" style={{ backgroundColor: settings.primary_color }}>
          <Plus className="w-4 h-4" /> إضافة صيدلية
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pharmacy) => (
            <div key={pharmacy.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden group">
              <div className="h-20 relative" style={{ background: pharmacy.cover_url ? `url(${pharmacy.cover_url}) center/cover` : `linear-gradient(135deg, ${settings.primary_color}33, ${settings.secondary_color}55)` }}>
                <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(pharmacy); setShowForm(true); }} className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center hover:bg-white"><Edit2 className="w-4 h-4 text-gray-700" /></button>
                  <button onClick={() => handleDelete(pharmacy.id)} className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center hover:bg-white"><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${pharmacy.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{pharmacy.is_active ? 'نشطة' : 'متوقفة'}</span>
                {pharmacy.is_24h && <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold bg-white/90 text-gray-800 flex items-center gap-1"><Clock className="w-3 h-3" style={{ color: settings.accent_color }} />24 ساعة</span>}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: settings.primary_color }}>
                    {pharmacy.logo_url ? <img src={pharmacy.logo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold text-lg">{pharmacy.name.charAt(0)}</span>}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{pharmacy.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{pharmacy.area || pharmacy.address}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-50">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3" />{pharmacy.rating}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{pharmacy.phone}</span>
                  {pharmacy.delivery_available && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />توصيل</span>}
                  {pharmacy.accept_insurance && <span className="flex items-center gap-1"><Shield className="w-3 h-3" />تأمين</span>}
                </div>

                {/* Pharmacy owner account */}
                <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap items-center gap-2">
                  {ownersMap[pharmacy.id] ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                      <KeyRound className="w-3 h-3" /> حساب المالك موجود
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                      <UserCog className="w-3 h-3" /> بدون حساب مالك
                    </span>
                  )}
                  <button
                    onClick={() => setOwnerModal(pharmacy)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-gray-900 text-white hover:bg-gray-700 active:scale-95 transition-all"
                  >
                    <KeyRound className="w-3 h-3" />
                    {ownersMap[pharmacy.id] ? 'إدارة حساب المالك' : 'إنشاء حساب المالك'}
                  </button>
                  <button
                    onClick={() => copyOwnerLink(pharmacy.name)}
                    title="نسخ رابط صفحة إدارة الصيدلية"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    <Link2 className="w-3 h-3" /> نسخ الرابط
                  </button>
                </div>

                {/* Home page sections toggle */}
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="text-[10px] font-black text-gray-400 mb-1.5">الظهور في تبويبات الرئيسية:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PHARMACY_SECTION_KEYS.map((key) => {
                      const m = PHARMACY_SECTIONS_META[key];
                      const active = (sections[key] || []).includes(pharmacy.id);
                      const saving = savingKey === `${pharmacy.id}:${key}`;
                      return (
                        <button
                          key={key}
                          onClick={() => toggleSection(pharmacy.id, key)}
                          disabled={!!saving}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all active:scale-95 disabled:opacity-60 ${
                            active ? 'text-white' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}
                          style={active ? { backgroundColor: settings.primary_color, borderColor: settings.primary_color } : {}}
                        >
                          {active ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <PharmacyForm pharmacy={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { fetchPharmacies(); setShowForm(false); setEditing(null); }} />}
      {ownerModal && <OwnerAccountModal pharmacy={ownerModal} onClose={() => setOwnerModal(null)} onSaved={() => fetchPharmacies()} />}
    </div>
  );
}

function OwnerAccountModal({ pharmacy, onClose, onSaved }: { pharmacy: Pharmacy; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const [owner, setOwner] = useState<PharmacyOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('pharmacy_owners')
        .select('*')
        .eq('pharmacy_id', pharmacy.id)
        .maybeSingle();
      if (err && /could not find the table|could not find the function|does not exist|relation .* not found/i.test(err.message)) {
        setError('جدول أصحاب الصيدليات غير موجود — شغّل ملف المايجرشن supabase/migrations/20260808120000_owner_auth_upgrade.sql في Supabase SQL Editor');
      }
      if (data) setOwner(data as PharmacyOwner);
      setLoading(false);
    })();
  }, [pharmacy.id]);

  const ownerLink = `${window.location.origin}/admin/pharmacy`;

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('برجاء إدخال اسم المالك والبريد الإلكتروني وكلمة مرور (6 أحرف على الأقل)');
      return;
    }
    setError(null);
    setSaving(true);
    const normalizedEmail = email.toLowerCase().trim();
    const { data, error: err } = await supabase
      .rpc('create_owner', {
        p_pharmacy_id: pharmacy.id,
        p_full_name: fullName.trim(),
        p_email: normalizedEmail,
        p_password: password,
        p_phone: phone.trim() || null,
      })
      .single();
    if (err) {
      setError(rpcError(err));
      setSaving(false);
      return;
    }
    setOwner(data as PharmacyOwner);
    setPassword('');
    setFullName('');
    setEmail('');
    setPhone('');
    setSaving(false);
    onSaved();
    showToast('تم إنشاء حساب المالك بنجاح');
  };

  const handleResetPassword = async () => {
    if (resetPassword.length < 6) {
      setError('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف');
      return;
    }
    setError(null);
    setSaving(true);
    const { error: err } = await supabase.rpc('reset_owner_password', {
      p_owner_id: owner!.id,
      p_password: resetPassword,
    });
    setSaving(false);
    if (err) {
      setError(rpcError(err));
      return;
    }
    setResetPassword('');
    showToast('تم تغيير كلمة المرور بنجاح');
  };

  const handleToggleActive = async () => {
    setSaving(true);
    const { error: err } = await supabase.rpc('set_owner_active', {
      p_owner_id: owner!.id,
      p_active: !owner!.is_active,
    });
    if (!err) {
      setOwner({ ...owner!, is_active: !owner!.is_active });
      showToast(owner!.is_active ? 'تم تعطيل حساب المالك' : 'تم تفعيل حساب المالك');
    } else {
      setError(rpcError(err));
    }
    setSaving(false);
  };

  function rpcError(err: { message?: string }): string {
    const m = (err.message || '').trim();
    if (!m) return 'حدث خطأ غير متوقع، حاول مرة أخرى';
    if (/function .* does not exist|could not find the function|could not find the table|relation .* not found/i.test(m)) {
      return 'الصلاحية غير موجودة — شغّل ملف المايجرشن supabase/migrations/20260808120000_owner_auth_upgrade.sql في Supabase SQL Editor';
    }
    if (/duplicate key value violates unique constraint/i.test(m)) {
      return 'هذا البريد الإلكتروني مسجل بالفعل كحساب مالك، ولا يمكن استخدامه لصيدلية أخرى';
    }
    return m;
  }

  return (
    <Modal onClose={onClose} title={`حساب مالك "${pharmacy.name}"`} wide>
      <div className="space-y-4">
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl">
            {toast}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Admin link */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p className="text-[11px] font-black text-gray-500 mb-1.5">رابط صفحة إدارة الصيدلية (يرسل لصاحب الصيدلية):</p>
          <div className="flex items-center gap-2">
            <input readOnly value={ownerLink} dir="ltr" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none" />
            <button
              onClick={async () => { await navigator.clipboard.writeText(ownerLink); showToast('تم نسخ الرابط'); }}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all"
              style={{ backgroundColor: settings.primary_color }}
            >
              <Copy className="w-3.5 h-3.5" /> نسخ
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-32 animate-pulse bg-gray-100 rounded-xl" />
        ) : owner ? (
          <div className="space-y-4">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: settings.primary_color }}>
                    {owner.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-sm">{owner.full_name}</p>
                    <p className="text-xs text-gray-600" dir="ltr">{owner.email}</p>
                    {owner.phone && <p className="text-[11px] text-gray-500" dir="ltr">{owner.phone}</p>}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${owner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {owner.is_active ? 'الحساب نشط' : 'الحساب معطّل'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">كلمة مرور جديدة</label>
                <input type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} dir="ltr" className={inputClass} placeholder="كلمة مرور جديدة (6 أحرف على الأقل)" />
              </div>
              <div className="flex items-end">
                <button onClick={handleResetPassword} disabled={saving} className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold disabled:opacity-50 hover:brightness-110 transition-all" style={{ backgroundColor: settings.primary_color }}>
                  <KeyRound className="w-3.5 h-3.5" /> تغيير كلمة المرور
                </button>
              </div>
            </div>

            <button
              onClick={handleToggleActive}
              disabled={saving}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 ${owner.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
            >
              {owner.is_active ? 'تعطيل حساب المالك' : 'تفعيل حساب المالك'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">لا يوجد حساب مالك لهذه الصيدلية بعد. أنشئ حساباً ليرسل لصاحبها ويبدأ بإدارة صيدليته:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="اسم المالك *"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="مثال: أحمد محمد" /></Field>
              <Field label="رقم الهاتف"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} dir="ltr" placeholder="01012345678" /></Field>
            </div>
            <Field label="البريد الإلكتروني *"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} dir="ltr" placeholder="owner@example.com" /></Field>
            <Field label="كلمة المرور * (6 أحرف على الأقل)"><input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} dir="ltr" placeholder="••••••••" /></Field>
            <button onClick={handleCreate} disabled={saving} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 hover:brightness-110 active:scale-[0.99] transition-all" style={{ backgroundColor: settings.primary_color }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCog className="w-4 h-4" />} إنشاء حساب المالك
            </button>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">إغلاق</button>
        </div>
      </div>
    </Modal>
  );
}

export function PharmacyForm({ pharmacy, onClose, onSaved }: { pharmacy: Pharmacy | null; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({
    name: pharmacy?.name || '', name_en: pharmacy?.name_en || '', description: pharmacy?.description || '',
    logo_url: pharmacy?.logo_url || '', cover_url: pharmacy?.cover_url || '',
    phone: pharmacy?.phone || '', whatsapp: pharmacy?.whatsapp || '', email: pharmacy?.email || '',
    address: pharmacy?.address || '', area: pharmacy?.area || '', city: pharmacy?.city || '',
    latitude: pharmacy?.latitude?.toString() || '30.0444', longitude: pharmacy?.longitude?.toString() || '31.2357',
    is_active: pharmacy?.is_active ?? true, rating: pharmacy?.rating?.toString() || '5.0',
    delivery_available: pharmacy?.delivery_available ?? false, delivery_fee: pharmacy?.delivery_fee?.toString() || '0',
    opening_hours: pharmacy?.opening_hours || '', is_24h: pharmacy?.is_24h ?? false,
    has_parking: pharmacy?.has_parking ?? false, accept_insurance: pharmacy?.accept_insurance ?? false,
    website_url: pharmacy?.website_url || '', pharmacy_type: pharmacy?.pharmacy_type || 'حديثة',
  });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const handleDetectLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('المتصفح لا يدعم تحديد الموقع الجغرافي');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((f) => ({
          ...f,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationError('تعذر تحديد الموقع، تأكد من منح الإذن وأعد المحاولة');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, latitude: parseFloat(form.latitude) || 0, longitude: parseFloat(form.longitude) || 0, rating: parseFloat(form.rating) || 5.0, delivery_fee: parseFloat(form.delivery_fee) || 0, updated_at: new Date().toISOString() };
    if (pharmacy) { await supabase.from('pharmacies').update(payload).eq('id', pharmacy.id); }
    else { await supabase.from('pharmacies').insert(payload); }
    setSaving(false); onSaved();
  };

  return (
    <Modal onClose={onClose} title={pharmacy ? 'تعديل صيدلية' : 'إضافة صيدلية جديدة'} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="اسم الصيدلية *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="صيدلية..." /></Field>
          <Field label="الاسم بالإنجليزية"><input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Pharmacy name" /></Field>
        </div>
        <Field label="المنطقة"><input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputClass} placeholder="مثال: المعادي" /></Field>
        <Field label="وصف الصيدلية"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} rows={2} placeholder="نبذة عن الصيدلية..." /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="رقم الهاتف"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} dir="ltr" placeholder="01012345678" /></Field>
          <Field label="واتساب"><input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className={inputClass} dir="ltr" placeholder="201012345678" /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="البريد الإلكتروني"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} dir="ltr" placeholder="email@example.com" /></Field>
          <Field label="ساعات العمل"><input value={form.opening_hours} onChange={(e) => setForm({ ...form, opening_hours: e.target.value })} className={inputClass} placeholder="9:00 ص - 11:00 م" /></Field>
        </div>
        <Field label="العنوان *"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} placeholder="العنوان بالتفصيل" /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="خط العرض (Latitude) *"><input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className={inputClass} dir="ltr" placeholder="30.0444" /></Field>
          <Field label="خط الطول (Longitude) *"><input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className={inputClass} dir="ltr" placeholder="31.2357" /></Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={locating}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:brightness-105 active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: settings.primary_color }}
          >
            <Navigation className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
            {locating ? 'جاري تحديد الموقع...' : 'تحديد موقع الصيدلية تلقائياً (GPS)'}
          </button>
          {locationError && <span className="text-xs font-bold text-red-500">{locationError}</span>}
        </div>
        {form.latitude && form.longitude && (
          <div className="rounded-2xl overflow-hidden border border-gray-200 relative">
            <iframe
              title="معاينة موقع الصيدلية على الخريطة"
              src={`https://www.google.com/maps?q=${form.latitude},${form.longitude}&z=15&output=embed`}
              className="w-full h-52"
              loading="lazy"
              style={{ border: 0 }}
            />
            <a
              href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 shadow text-xs font-bold text-gray-700 hover:bg-white"
            >
              <ExternalLink className="w-3.5 h-3.5" /> فتح في خرائط جوجل
            </a>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="التقييم"><input value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className={inputClass} dir="ltr" type="number" step="0.1" min="0" max="5" /></Field>
          <Field label="رسوم التوصيل"><input value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })} className={inputClass} dir="ltr" type="number" /></Field>
          <Field label="المدينة"><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} placeholder="القاهرة" /></Field>
          <Field label="نوع الصيدلية"><select value={form.pharmacy_type} onChange={(e) => setForm({ ...form, pharmacy_type: e.target.value })} className={inputClass}><option value="حديثة">حديثة</option><option value="شعبية">شعبية</option><option value="متخصصة">متخصصة</option></select></Field>
        </div>
        <Field label="رابط موقع الصيدلية"><input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className={inputClass} dir="ltr" placeholder="https://..." /></Field>
        <ImageUrlField label="رابط شعار الصيدلية (Logo)" value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} />
        <ImageUrlField label="رابط صورة الغلاف" value={form.cover_url} onChange={(v) => setForm({ ...form, cover_url: v })} />
        <div className="flex flex-wrap gap-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">صيدلية نشطة</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.delivery_available} onChange={(e) => setForm({ ...form, delivery_available: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">توصيل</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_24h} onChange={(e) => setForm({ ...form, is_24h: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">24 ساعة</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.has_parking} onChange={(e) => setForm({ ...form, has_parking: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">موقف سيارات</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.accept_insurance} onChange={(e) => setForm({ ...form, accept_insurance: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">تأمين صحي</span></label>
        </div>
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving || !form.name || !form.address} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: settings.primary_color }}><Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// Products Tab
// ============================================
export function ProductsTab({ pharmacyId }: { pharmacyId?: string }) {
  const { settings } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPharmacy, setFilterPharmacy] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('products').select('*, pharmacy:pharmacies(*), category:categories(*), discounts(*)').order('name');
    if (pharmacyId) query = query.eq('pharmacy_id', pharmacyId);
    const { data } = await query;
    setProducts((data || []) as Product[]);
    setLoading(false);
  }, [pharmacyId]);

  useEffect(() => {
    fetchProducts();
    if (!pharmacyId) {
      supabase.from('pharmacies').select('*').order('name').then(({ data }) => setPharmacies((data || []) as Pharmacy[]));
    }
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories((data || []) as Category[]));
  }, [fetchProducts, pharmacyId]);

  const filtered = products.filter((p) => !filterPharmacy || p.pharmacy_id === filterPharmacy).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative w-full sm:max-w-xs">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث عن منتج..." className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm" style={{ ['--tw-ring-color' as string]: settings.primary_color }} />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          {!pharmacyId && (
            <select value={filterPharmacy} onChange={(e) => setFilterPharmacy(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm" style={{ ['--tw-ring-color' as string]: settings.primary_color }}>
              <option value="">كل الصيدليات</option>
              {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium shrink-0" style={{ backgroundColor: settings.primary_color }}><Plus className="w-4 h-4" /> إضافة منتج</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs"><tr>
                <th className="text-right p-3 font-medium">المنتج</th>
                {!pharmacyId && <th className="text-right p-3 font-medium hidden sm:table-cell">الصيدلية</th>}
                <th className="text-right p-3 font-medium hidden md:table-cell">الفئة</th>
                <th className="text-right p-3 font-medium">السعر</th>
                <th className="text-right p-3 font-medium hidden sm:table-cell">المخزون</th>
                <th className="text-right p-3 font-medium hidden sm:table-cell">الحالة</th>
                <th className="text-center p-3 font-medium">إجراءات</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((product) => {
                  const discount = product.discounts?.find((d) => d.is_active);
                  const finalPrice = discount ? product.price * (1 - discount.discount_percentage / 100) : product.price;
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {product.image_url ? <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><Package className="w-5 h-5 text-gray-300" /></div>}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-[160px]">{product.name}</p>
                            {product.active_ingredient && <p className="text-xs text-gray-400 truncate">{product.active_ingredient}</p>}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {product.requires_prescription && <span className="text-xs text-amber-600">يحتاج وصفة</span>}
                              {product.is_medical === false && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">بدون وظيفة طبية</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      {!pharmacyId && <td className="p-3 text-gray-600 hidden sm:table-cell">{product.pharmacy?.name}</td>}
                      <td className="p-3 text-gray-600 hidden md:table-cell">{product.category?.name || '-'}</td>
                      <td className="p-3"><span className="font-semibold" style={{ color: settings.primary_color }}>{finalPrice.toFixed(2)}</span>{discount && <span className="text-xs text-gray-400 line-through mr-1">{product.price.toFixed(2)}</span>}<span className="text-xs text-gray-400"> ج.م</span></td>
                      <td className="p-3 hidden sm:table-cell"><span className={`text-xs font-medium ${product.stock_quantity > 10 ? 'text-green-600' : product.stock_quantity > 0 ? 'text-amber-600' : 'text-red-500'}`}>{product.stock_quantity}</span></td>
                      <td className="p-3 hidden sm:table-cell"><span className={`px-2 py-0.5 rounded-full text-xs ${product.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{product.is_available ? 'متوفر' : 'غير متوفر'}</span></td>
                      <td className="p-3"><div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditing(product); setShowForm(true); }} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><Edit2 className="w-4 h-4 text-gray-600" /></button>
                        <button onClick={() => handleDelete(product.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-4 h-4 text-red-500" /></button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && <ProductForm product={editing} pharmacies={pharmacies} categories={categories} lockedPharmacy={pharmacyId ? { id: pharmacyId, name: '' } : undefined} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { fetchProducts(); setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

export function ProductForm({ product, pharmacies, categories, onClose, onSaved, lockedPharmacy }: { product: Product | null; pharmacies: Pharmacy[]; categories: Category[]; onClose: () => void; onSaved: () => void; lockedPharmacy?: { id: string; name: string } }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({
    name: product?.name || '', name_en: product?.name_en || '', description: product?.description || '',
    price: product?.price?.toString() || '', unit: product?.unit || 'قطعة', image_url: product?.image_url || '',
    pharmacy_id: lockedPharmacy?.id || product?.pharmacy_id || pharmacies[0]?.id || '', category_id: product?.category_id || '',
    for_all_pharmacies: product?.for_all_pharmacies ?? false,
    is_available: product?.is_available ?? true, requires_prescription: product?.requires_prescription ?? false,
    is_medical: product?.is_medical ?? true,
    active_ingredient: product?.active_ingredient || '', manufacturer: product?.manufacturer || '',
    form_type: product?.form || '', dosage: product?.dosage || '',
    how_to_use: product?.how_to_use || '', contraindications: product?.contraindications || '',
    interactions: product?.interactions || '',
    stock_quantity: product?.stock_quantity?.toString() || '0', barcode: product?.barcode || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ownerPharmacyId = lockedPharmacy?.id || (form.for_all_pharmacies && !form.pharmacy_id ? pharmacies[0]?.id || '' : form.pharmacy_id);
    const payload = {
      name: form.name, name_en: form.name_en, description: form.description,
      price: parseFloat(form.price) || 0, unit: form.unit, image_url: form.image_url,
      pharmacy_id: ownerPharmacyId, category_id: form.category_id || null,
      for_all_pharmacies: form.for_all_pharmacies,
      is_available: form.is_available, requires_prescription: form.requires_prescription,
      is_medical: form.is_medical,
      active_ingredient: form.active_ingredient || null, manufacturer: form.manufacturer || null,
      form: form.form_type || null, dosage: form.dosage || null,
      how_to_use: form.how_to_use || null, contraindications: form.contraindications || null,
      interactions: form.interactions || null,
      stock_quantity: parseInt(form.stock_quantity) || 0, barcode: form.barcode || null,
      updated_at: new Date().toISOString(),
    };
    if (product) {
      const wasUnavailable = !product.is_available;
      await supabase.from('products').update(payload).eq('id', product.id);
      if (wasUnavailable && payload.is_available) {
        await notifyStockAvailable(product.id);
      }
    }
    else { await supabase.from('products').insert(payload); }
    setSaving(false); onSaved();
  };

  return (
    <Modal onClose={onClose} title={product ? 'تعديل منتج' : 'إضافة منتج جديد'} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="اسم المنتج *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="اسم المنتج بالعربية" /></Field>
          <Field label="الاسم بالإنجليزية"><input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Product name" /></Field>
        </div>
        <Field label="الوصف"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} rows={2} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="السعر (ج.م) *"><input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} dir="ltr" type="number" step="0.01" /></Field>
          <Field label="الوحدة"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputClass} placeholder="شريط / علبة" /></Field>
          <Field label="الفئة"><select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={inputClass}><option value="">بدون فئة</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        </div>
        {!lockedPharmacy && (
          <div className="space-y-2">
            <Field label="الصيدلية">
              <select
                value={form.pharmacy_id}
                onChange={(e) => setForm({ ...form, pharmacy_id: e.target.value })}
                className={inputClass}
                disabled={form.for_all_pharmacies}
              >
                <option value="">اختر صيدلية</option>
                {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.for_all_pharmacies}
                onChange={(e) => setForm({ ...form, for_all_pharmacies: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">متاح في جميع الصيدليات</span>
            </label>
            {form.for_all_pharmacies && (
              <p className="text-[11px] font-bold text-teal-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> هذا المنتج سيظهر في كل صيدليات الموقع.
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="المادة الفعالة"><input value={form.active_ingredient} onChange={(e) => setForm({ ...form, active_ingredient: e.target.value })} className={inputClass} placeholder="مثال: باراسيتامول" /></Field>
          <Field label="الشركة المنتجة"><input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className={inputClass} placeholder="مثال: GlaxoSmithKline" /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="الشكل الدوائي"><select value={form.form_type} onChange={(e) => setForm({ ...form, form_type: e.target.value })} className={inputClass}><option value="">اختر</option><option value="أقراص">أقراص</option><option value="كبسولات">كبسولات</option><option value="شراب">شراب</option><option value="كريم">كريم</option><option value="حقن">حقن</option><option value="أقراص فوارة">أقراص فوارة</option><option value="قطرات">قطرات</option><option value="بخاخ">بخاخ</option></select></Field>
          <Field label="الجرعة"><input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} className={inputClass} dir="ltr" placeholder="500mg" /></Field>
          <Field label="الكمية في المخزون"><input value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} className={inputClass} dir="ltr" type="number" /></Field>
        </div>
        <Field label="الباركود"><input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className={inputClass} dir="ltr" placeholder="اختياري" /></Field>
        <Field label="طريقة الاستخدام (اختياري)"><textarea value={form.how_to_use} onChange={(e) => setForm({ ...form, how_to_use: e.target.value })} className={inputClass} rows={2} placeholder="مثال: قرص واحد بعد الأكل كل 8 ساعات" /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="متى لا يُستخدم (موانع الاستخدام)"><textarea value={form.contraindications} onChange={(e) => setForm({ ...form, contraindications: e.target.value })} className={inputClass} rows={2} placeholder="مثال: لا يُستخدم لمرضى الكبد أو الحساسية من المادة الفعالة" /></Field>
          <Field label="التفاعلات الدوائية"><textarea value={form.interactions} onChange={(e) => setForm({ ...form, interactions: e.target.value })} className={inputClass} rows={2} placeholder="مثال: يتعارض مع مميعات الدم" /></Field>
        </div>
        <ImageUrlField label="رابط صورة المنتج" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
        <div className="flex gap-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">متوفر</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.requires_prescription} onChange={(e) => setForm({ ...form, requires_prescription: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">يحتاج وصفة طبية</span></label>
        </div>
        <Field label="نوع المنتج">
          <select value={form.is_medical ? 'medical' : 'non_medical'} onChange={(e) => setForm({ ...form, is_medical: e.target.value === 'medical' })} className={inputClass}>
            <option value="medical">منتج بوظيفة طبية</option>
            <option value="non_medical">منتج بدون وظيفة طبية</option>
          </select>
          {!form.is_medical && (
            <p className="mt-1.5 text-[11px] font-bold text-amber-600 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> ستظهر عبارة «بدون وظيفة طبية» على بطاقة المنتج ووصفه في المتجر.
            </p>
          )}
        </Field>
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving || !form.name || (!form.for_all_pharmacies && !form.pharmacy_id) || !form.price} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: settings.primary_color }}><Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// Categories Tab
// ============================================
function CategoriesTab() {
  const { settings } = useSettings();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true, nullsFirst: false });
    if (error || !data) {
      const { data: fallback } = await supabase.from('categories').select('*').order('name');
      setCategories((fallback || []) as Category[]);
    } else {
      setCategories((data || []) as Category[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchCategories();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm text-gray-500">إدارة فئات الأدوية والمنتجات</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: settings.primary_color }}><Plus className="w-4 h-4" /> إضافة فئة</button>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((cat) => {
            const CatIcon = categoryIcon(cat.slug, cat.icon);
            const color = categoryColor(cat.slug);
            return (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-100 p-4 text-center group">
                <div className="flex justify-end gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(cat); setShowForm(true); }} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center"><Edit2 className="w-3.5 h-3.5 text-gray-600" /></button>
                  <button onClick={() => handleDelete(cat.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: `${color}18`, color }}><CatIcon className="w-6 h-6" /></div>
                <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                {cat.name_en && <p className="text-xs text-gray-400 mt-0.5">{cat.name_en}</p>}
              </div>
            );
          })}
        </div>
      )}
      {showForm && <CategoryForm category={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { fetchCategories(); setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function CategoryForm({ category, onClose, onSaved }: { category: Category | null; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({ name: category?.name || '', name_en: category?.name_en || '', slug: category?.slug || '', icon: category?.icon || '', sort_order: category?.sort_order?.toString() || '' });
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    const slug = form.slug || form.name_en?.toLowerCase().replace(/\s+/g, '-') || form.name.trim().replace(/\s+/g, '-');
    const payload = { ...form, slug, sort_order: form.sort_order.trim() ? Number(form.sort_order.trim()) : null };
    if (category) { await supabase.from('categories').update(payload).eq('id', category.id); } else { await supabase.from('categories').insert(payload); }
    setSaving(false); onSaved();
  };
  return (
    <Modal onClose={onClose} title={category ? 'تعديل فئة' : 'إضافة فئة جديدة'}>
      <div className="space-y-4">
        <Field label="الاسم بالعربية *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
        <Field label="الاسم بالإنجليزية"><input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className={inputClass} dir="ltr" /></Field>
        <Field label="المعرف (slug)"><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputClass} dir="ltr" placeholder="auto-generated if empty" /></Field>
        <Field label="الأيقونة">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border" style={{ backgroundColor: `${categoryColor(form.slug)}18`, color: categoryColor(form.slug), borderColor: `${categoryColor(form.slug)}30` }}>
              {(() => { const IconPreview = categoryIcon(form.slug, form.icon); return <IconPreview className="w-5 h-5" />; })()}
            </div>
            <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={inputClass}>
              <option value="">تلقائي (حسب الفئة)</option>
              {Object.keys(CATEGORY_ICON_MAP).map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="ترتيب الظهور (رقم صغير = الأول)"><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={inputClass} dir="ltr" placeholder="اختياري" /></Field>
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving || !form.name} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: settings.primary_color }}><Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// Discounts Tab
// ============================================
function DiscountsTab() {
  const { settings } = useSettings();
  const [discounts, setDiscounts] = useState<(Discount & { product?: Product; pharmacy?: Pharmacy })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('discounts').select('*, product:products(*), pharmacy:pharmacies(*)').order('created_at', { ascending: false });
    setDiscounts((data || []) as (Discount & { product?: Product; pharmacy?: Pharmacy })[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDiscounts();
    supabase.from('products').select('*, pharmacy:pharmacies(*)').order('name').then(({ data }) => setProducts((data || []) as Product[]));
    supabase.from('pharmacies').select('*').order('name').then(({ data }) => setPharmacies((data || []) as Pharmacy[]));
  }, [fetchDiscounts]);

  const handleDelete = async (id: string) => { if (!confirm('حذف هذا الخصم؟')) return; await supabase.from('discounts').delete().eq('id', id); fetchDiscounts(); };
  const toggleActive = async (d: Discount) => { await supabase.from('discounts').update({ is_active: !d.is_active }).eq('id', d.id); fetchDiscounts(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm text-gray-500">إدارة الخصومات والعروض</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: settings.primary_color }}><Plus className="w-4 h-4" /> إضافة خصم</button>
      </div>
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : discounts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><TrendingDown className="w-12 h-12 mx-auto text-gray-200 mb-3" /><p className="text-gray-500">لا توجد خصومات حالياً</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {discounts.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${settings.accent_color}15` }}><TrendingDown className="w-5 h-5" style={{ color: settings.accent_color }} /></div>
                  <div><p className="font-bold text-lg" style={{ color: settings.accent_color }}>{d.discount_percentage}%</p><p className="text-xs text-gray-400">خصم</p></div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{d.is_active ? 'نشط' : 'متوقف'}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 truncate">{d.product?.name}</p>
              <p className="text-xs text-gray-500">{d.pharmacy?.name}</p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                <button onClick={() => { setEditing(d); setShowForm(true); }} className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600 flex items-center justify-center gap-1"><Edit2 className="w-3 h-3" /> تعديل</button>
                <button onClick={() => toggleActive(d)} className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600 flex items-center justify-center gap-1">{d.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}{d.is_active ? 'إيقاف' : 'تفعيل'}</button>
                <button onClick={() => handleDelete(d.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && <DiscountForm discount={editing} products={products} pharmacies={pharmacies} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { fetchDiscounts(); setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function DiscountForm({ discount, products, pharmacies, onClose, onSaved }: { discount: Discount | null; products: Product[]; pharmacies: Pharmacy[]; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({ product_id: discount?.product_id || '', pharmacy_id: discount?.pharmacy_id || '', discount_percentage: discount?.discount_percentage?.toString() || '10', is_active: discount?.is_active ?? true });
  const [saving, setSaving] = useState(false);
  const filteredProducts = products.filter((p) => !form.pharmacy_id || p.pharmacy_id === form.pharmacy_id);
  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, discount_percentage: parseFloat(form.discount_percentage) || 0 };
    if (discount) { await supabase.from('discounts').update(payload).eq('id', discount.id); } else { await supabase.from('discounts').insert(payload); }
    setSaving(false); onSaved();
  };
  return (
    <Modal onClose={onClose} title={discount ? 'تعديل خصم' : 'إضافة خصم جديد'}>
      <div className="space-y-4">
        <Field label="الصيدلية *"><select value={form.pharmacy_id} onChange={(e) => setForm({ ...form, pharmacy_id: e.target.value, product_id: '' })} className={inputClass}><option value="">اختر صيدلية</option>{pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="المنتج *"><select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className={inputClass} disabled={!form.pharmacy_id}><option value="">{form.pharmacy_id ? 'اختر منتج' : 'اختر صيدلية أولاً'}</option>{filteredProducts.map((p) => <option key={p.id} value={p.id}>{p.name} - {p.price} ج.م</option>)}</select></Field>
        <Field label="نسبة الخصم % *"><input value={form.discount_percentage} onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })} className={inputClass} dir="ltr" type="number" min="1" max="100" /></Field>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">خصم نشط</span></label>
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving || !form.product_id || !form.pharmacy_id} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: settings.primary_color }}><Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// Coupons Tab
// ============================================
function CouponsTab() {
  const { settings } = useSettings();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    setCoupons((data || []) as Coupon[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا الكود؟')) return;
    await supabase.from('coupons').delete().eq('id', id);
    showToast('تم حذف الكود');
    fetchCoupons();
  };

  const toggleActive = async (c: Coupon) => {
    await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id);
    fetchCoupons();
  };

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    showToast('تم نسخ الكود');
  };

  const isExpired = (c: Coupon) => !!c.expires_at && new Date(c.expires_at) < new Date();
  const reachedLimit = (c: Coupon) => !!c.usage_limit && c.used_count >= c.usage_limit;
  const unavailable = (c: Coupon) => !c.is_active || isExpired(c) || reachedLimit(c);

  return (
    <div>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm text-gray-500">إنشاء أكواد خصم يمكن للعملاء استخدامها عند الطلب</h2>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: settings.primary_color }}><Plus className="w-4 h-4" /> إضافة كود خصم</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><Ticket className="w-12 h-12 mx-auto text-gray-200 mb-3" /><p className="text-gray-500">لا توجد أكواد خصم حالياً</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((c) => {
            const expired = isExpired(c);
            const limitReached = reachedLimit(c);
            const off = unavailable(c);
            return (
              <div key={c.id} className={`bg-white rounded-xl border p-4 ${off ? 'border-gray-200 opacity-70' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${settings.primary_color}15` }}>
                      <Ticket className="w-5 h-5" style={{ color: settings.primary_color }} />
                    </div>
                    <div>
                      <button onClick={() => handleCopy(c.code)} title="نسخ الكود" className="flex items-center gap-1.5 font-black text-lg tracking-wider" style={{ color: settings.primary_color }} dir="ltr">
                        {c.code}
                        <Copy className="w-3.5 h-3.5 opacity-50" />
                      </button>
                      <p className="text-xs text-gray-400">{c.discount_type === 'percent' ? `خصم ${c.value}%` : `خصم ${c.value} ج.م`}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${off ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                    {expired ? 'منتهي' : limitReached ? 'اكتمل الاستخدام' : !c.is_active ? 'متوقف' : 'نشط'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 mb-3">
                  <div className="bg-gray-50 rounded-lg p-2"><p className="font-bold text-gray-700">الحد الأدنى</p><p>{c.min_order > 0 ? `${c.min_order} ج.م` : 'بدون'}</p></div>
                  <div className="bg-gray-50 rounded-lg p-2"><p className="font-bold text-gray-700">الاستخدام</p><p dir="ltr">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</p></div>
                  <div className="bg-gray-50 rounded-lg p-2"><p className="font-bold text-gray-700">أقصى خصم</p><p>{c.max_discount ? `${c.max_discount} ج.م` : 'بدون'}</p></div>
                  <div className="bg-gray-50 rounded-lg p-2"><p className="font-bold text-gray-700">ينتهي</p><p>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('ar-EG') : 'لا ينتهي'}</p></div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => { setEditing(c); setShowForm(true); }} className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600 flex items-center justify-center gap-1"><Edit2 className="w-3 h-3" /> تعديل</button>
                  <button onClick={() => toggleActive(c)} className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600 flex items-center justify-center gap-1">{c.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}{c.is_active ? 'إيقاف' : 'تفعيل'}</button>
                  <button onClick={() => handleDelete(c.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showForm && <CouponForm coupon={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { fetchCoupons(); setShowForm(false); setEditing(null); showToast(editing ? 'تم تحديث الكود' : 'تم إضافة الكود'); }} />}
    </div>
  );
}

function CouponForm({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({
    code: coupon?.code || '',
    discount_type: coupon?.discount_type || 'percent',
    value: coupon?.value?.toString() || '10',
    min_order: coupon?.min_order?.toString() || '0',
    max_discount: coupon?.max_discount?.toString() || '',
    usage_limit: coupon?.usage_limit?.toString() || '',
    expires_at: coupon?.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 10) : '',
    is_active: coupon?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.code.trim()) return;
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      value: parseFloat(form.value) || 0,
      min_order: parseFloat(form.min_order) || 0,
      max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    };
    if (coupon) { await supabase.from('coupons').update(payload).eq('id', coupon.id); } else { await supabase.from('coupons').insert(payload); }
    setSaving(false); onSaved();
  };

  return (
    <Modal onClose={onClose} title={coupon ? 'تعديل كود الخصم' : 'إضافة كود خصم جديد'}>
      <div className="space-y-4">
        <Field label="كود الخصم *"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputClass} dir="ltr" placeholder="مثال: SAVE15" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="نوع الخصم">
            <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percent' | 'fixed' })} className={inputClass}>
              <option value="percent">نسبة %</option>
              <option value="fixed">مبلغ ثابت</option>
            </select>
          </Field>
          <Field label={form.discount_type === 'percent' ? 'نسبة الخصم % *' : 'قيمة الخصم (ج.م) *'}>
            <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputClass} dir="ltr" type="number" min="0" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الحد الأدنى للطلب (ج.م)"><input value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} className={inputClass} dir="ltr" type="number" min="0" /></Field>
          <Field label="أقصى مبلغ للخصم (ج.م)"><input value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} className={inputClass} dir="ltr" type="number" min="0" placeholder="اختياري" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="حد الاستخدام"><input value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className={inputClass} dir="ltr" type="number" min="1" placeholder="اختياري" /></Field>
          <Field label="تاريخ الانتهاء"><input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={inputClass} dir="ltr" /></Field>
        </div>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">الكود نشط</span></label>
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving || !form.code.trim()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: settings.primary_color }}><Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// Customers Tab
// ============================================
interface CustomerRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  created_at: string;
  ordersCount: number;
  totalSpent: number;
}

function CustomersTab() {
  const { settings } = useSettings();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: customers } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      const { data: orders } = await supabase.from('orders').select('customer_id, total_price, status');
      const byCustomer: Record<string, { count: number; total: number }> = {};
      (orders || []).forEach((o) => {
        if (!byCustomer[o.customer_id]) byCustomer[o.customer_id] = { count: 0, total: 0 };
        byCustomer[o.customer_id].count += 1;
        if (o.status !== 'cancelled') byCustomer[o.customer_id].total += (o.total_price || 0);
      });
      setRows(((customers || []) as CustomerProfileLike[]).map((c) => ({
        id: c.id,
        full_name: c.full_name,
        phone: c.phone,
        email: c.email,
        created_at: c.created_at,
        ordersCount: byCustomer[c.id]?.count || 0,
        totalSpent: byCustomer[c.id]?.total || 0,
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = rows.filter((r) =>
    !search ||
    (r.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا العميل نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    await supabase.from('customers').delete().eq('id', id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-sm text-gray-500">إجمالي العملاء: {rows.length}</h2>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد أو الهاتف..." className={`${inputClass} pr-9`} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><Users className="w-12 h-12 mx-auto text-gray-200 mb-3" /><p className="text-gray-500">{search ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء بعد'}</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-right text-xs text-gray-400">
                <th className="p-3 font-medium">العميل</th>
                <th className="p-3 font-medium">الهاتف</th>
                <th className="p-3 font-medium">البريد</th>
                <th className="p-3 font-medium">الطلبات</th>
                <th className="p-3 font-medium">إجمالي المشتريات</th>
                <th className="p-3 font-medium">تاريخ التسجيل</th>
                <th className="p-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: settings.primary_color }}>
                        {(r.full_name || r.email || '؟').charAt(0)}
                      </div>
                      <span className="font-medium text-gray-800">{r.full_name || 'بدون اسم'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-600" dir="ltr">{r.phone || '-'}</td>
                  <td className="p-3 text-gray-600" dir="ltr">{r.email}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">{r.ordersCount}</span>
                  </td>
                  <td className="p-3 font-bold" style={{ color: settings.primary_color }}>{r.totalSpent.toFixed(0)} ج.م</td>
                  <td className="p-3 text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('ar-EG')}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors"
                      title="حذف العميل"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface CustomerProfileLike {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  created_at: string;
}

// ============================================
// Reviews Tab

function ReviewsTab() {
  const { settings } = useSettings();
  const [list, setList] = useState<Review[]>([]);
  const [pharmacies, setPharmacies] = useState<Pick<Pharmacy, 'id' | 'name'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({ pharmacy_id: '', customer_name: '', rating: 5, comment: '', is_visible: true });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reviews')
      .select('*, pharmacy:pharmacies(name, is_active)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    setList((data || []) as Review[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReviews();
    supabase
      .from('pharmacies')
      .select('id, name')
      .order('name', { ascending: true })
      .then(({ data }) => {
        const pharms = (data || []) as Pick<Pharmacy, 'id' | 'name'>[];
        setPharmacies(pharms);
        setForm((f) => ({ ...f, pharmacy_id: f.pharmacy_id || pharms[0]?.id || '' }));
      });
  }, [fetchReviews]);

  const toggleVisible = async (r: Review) => {
    if (togglingId) return;
    setTogglingId(r.id);
    const next = !r.is_visible;
    setList((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_visible: next } : x)));
    const { error } = await supabase.from('reviews').update({ is_visible: next }).eq('id', r.id);
    setTogglingId(null);
    if (error) {
      setList((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_visible: r.is_visible } : x)));
      showToast(
        String(error.message).includes('is_visible')
          ? 'عمود is_visible غير موجود — شغّل ملف 20260811000000_reviews_management.sql في Supabase SQL Editor أولاً'
          : `فشل التحديث: ${error.message}`
      );
      return;
    }
    showToast(next ? 'تم إظهار التقييم في المتجر' : 'تم إخفاء التقييم من المتجر');
    fetchReviews();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا التقييم نهائياً؟')) return;
    await supabase.from('reviews').delete().eq('id', id);
    showToast('تم حذف التقييم');
    fetchReviews();
  };

  const move = async (r: Review, dir: number) => {
    const idx = list.findIndex((x) => x.id === r.id);
    const target = list[idx + dir];
    if (!target) return;
    await Promise.all([
      supabase.from('reviews').update({ sort_order: target.sort_order ?? 0 }).eq('id', r.id),
      supabase.from('reviews').update({ sort_order: r.sort_order ?? 0 }).eq('id', target.id),
    ]);
    fetchReviews();
  };

  const handleAdd = async () => {
    if (!form.pharmacy_id) return;
    setSaving(true);
    const { data } = await supabase
      .from('reviews')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = (data && data.length > 0 ? (data[0].sort_order ?? 0) : -1) + 1;
    await supabase.from('reviews').insert({
      pharmacy_id: form.pharmacy_id,
      customer_name: form.customer_name.trim() || 'عميل',
      rating: form.rating,
      comment: form.comment.trim() || null,
      is_visible: form.is_visible,
      sort_order: nextOrder,
    });
    setSaving(false);
    setShowForm(false);
    setForm((f) => ({ ...f, customer_name: '', comment: '', rating: 5, is_visible: true }));
    showToast('تم إضافة التقييم');
    fetchReviews();
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-sm text-gray-500">إدارة تقييمات العملاء — إظهار/إخفاء وترتيب يظهر كما هو في المتجر</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium"
          style={{ backgroundColor: settings.primary_color }}
        >
          <Plus className="w-4 h-4" /> إضافة تقييم
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <MessageSquareQuote className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">لا توجد تقييمات حتى الآن</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map((r, i) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col">
                  <button onClick={() => move(r, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center disabled:opacity-25 disabled:hover:bg-transparent" title="تحريك لأعلى">
                    <ChevronUp className="w-4 h-4 text-gray-600" />
                  </button>
                  <button onClick={() => move(r, 1)} disabled={i === list.length - 1} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center disabled:opacity-25 disabled:hover:bg-transparent" title="تحريك لأسفل">
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0" style={{ backgroundColor: settings.primary_color }}>
                  {(r.customer_name || '؟').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-800">{r.customer_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{r.pharmacy?.name || 'صيدلية'}</span>
                    {r.customer_id && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">من متجر</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    ))}
                    <span className="text-[11px] text-gray-400 mr-1">{new Date(r.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                  {r.comment && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{r.comment}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleVisible(r)}
                    disabled={togglingId === r.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-60 ${r.is_visible ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {togglingId === r.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : r.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {r.is_visible ? 'ظاهر' : 'مخفي'}
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center" title="حذف">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-gray-800">إضافة تقييم جديد</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">الصيدلية</label>
                <select
                  value={form.pharmacy_id}
                  onChange={(e) => setForm({ ...form, pharmacy_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="" disabled>اختر الصيدلية</option>
                  {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">اسم العميل</label>
                <input
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="مثال: أحمد محمد"
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">التقييم</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setForm({ ...form, rating: s })} className="transition-transform hover:scale-125">
                      <Star className={`w-6 h-6 ${s <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">التعليق</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  rows={3}
                  placeholder="اكتب نص التقييم (اختياري)..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_visible}
                  onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
                  className="w-4 h-4 accent-green-600"
                />
                <span className="text-sm font-bold text-gray-700">ظاهر للعملاء في المتجر</span>
              </label>
              <button
                onClick={handleAdd}
                disabled={saving || !form.pharmacy_id}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: settings.primary_color }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'جاري الحفظ...' : 'حفظ التقييم'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Subscribers Tab
// ============================================
function SubscribersTab() {
  const { settings } = useSettings();
  const [list, setList] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });
    setList((data || []) as NewsletterSubscriber[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا المشترك؟')) return;
    await supabase.from('newsletter_subscribers').delete().eq('id', id);
    fetchSubs();
  };

  const handleExport = () => {
    const emails = list.map((s) => s.email).join('\n');
    navigator.clipboard?.writeText(emails);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-sm text-gray-500">إجمالي المشتركين: {list.length}</h2>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50">
          <Copy className="w-3.5 h-3.5" /> نسخ جميع الإيميلات
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><Inbox className="w-12 h-12 mx-auto text-gray-200 mb-3" /><p className="text-gray-500">لا يوجد مشتركون بعد — المشتركون من صندوق النشرة في التذييل سيظهرون هنا</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {list.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-3 p-3.5 ${i !== 0 ? 'border-t border-gray-50' : ''}`}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${settings.primary_color}15` }}>
                <Mail className="w-4 h-4" style={{ color: settings.primary_color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate" dir="ltr">{s.email}</p>
                <p className="text-[11px] text-gray-400">اشترك في {new Date(s.created_at).toLocaleDateString('ar-EG')}</p>
              </div>
              <button onClick={() => handleDelete(s.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Stock Alerts Tab

function StockAlertsTab() {
  const { settings } = useSettings();
  const [list, setList] = useState<Array<{ id: string; created_at: string; product: { id: string; name: string; image_url?: string | null; is_available: boolean; unit?: string | null }; customer: { full_name?: string | null; phone?: string | null; email?: string | null } }>>([]);
  const [loading, setLoading] = useState(true);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('stock_alerts')
      .select('*, product:products(id, name, image_url, is_available, unit), customer:customers(full_name, phone, email)')
      .order('created_at', { ascending: false })
      .limit(200);
    setList((data || []) as typeof list);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleNotify = async (alert: typeof list[number]) => {
    if (!confirm(`إرسال إشعار "الدواء أصبح متوفراً" لهذا العميل الآن وحذف طلبه؟`)) return;
    setNotifyingId(alert.id);
    const { error } = await supabase.from('products').update({ is_available: true }).eq('id', alert.product.id);
    if (!error) {
      await notifyStockAvailable(alert.product.id);
      showToast('تم إرسال الإشعار وإعادة تفعيل المنتج');
    }
    setNotifyingId(null);
    fetchAlerts();
  };

  const handleDeleteAll = async () => {
    if (!confirm('حذف جميع طلبات تنبيه التوفر؟')) return;
    await supabase.from('stock_alerts').delete().neq('id', '');
    fetchAlerts();
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-sm text-gray-500">طلبات "نبهني عند التوفر": {list.length}</h2>
        {list.length > 0 && (
          <button onClick={handleDeleteAll} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-white text-xs font-bold text-red-600 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> حذف الكل
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <BellRing className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">لا توجد طلبات تنبيه حالياً — عندما يطلب العميل التنبيه على منتج غير متوفر سيظهر هنا</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {list.map((alert, i) => {
            const productAvailable = alert.product?.is_available;
            return (
              <div key={alert.id} className={`flex items-center gap-3 p-3.5 ${i !== 0 ? 'border-t border-gray-50' : ''} flex-wrap`}>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  {alert.product?.image_url ? (
                    <img src={alert.product.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Pill className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{alert.product?.name || 'منتج محذوف'}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {alert.customer?.full_name || 'عميل'} • {alert.customer?.phone || alert.customer?.email || 'بدون بيانات'}
                  </p>
                  <p className="text-[10px] text-gray-300">طلب في {new Date(alert.created_at).toLocaleDateString('ar-EG')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${productAvailable ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {productAvailable ? 'متوفر' : 'غير متوفر'}
                  </span>
                  {!productAvailable && (
                    <button
                      onClick={() => handleNotify(alert)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all"
                      style={{ backgroundColor: settings.primary_color }}
                    >
                      {notifyingId === alert.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                      فعّله وأشعره
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// Loyalty Tab

function LoyaltyTab() {
  const { settings } = useSettings();
  const [history, setHistory] = useState<Array<{ id: string; points: number; reason: string; created_at: string; customer: { full_name?: string | null; phone?: string | null; email?: string | null } }>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earned' | 'spent'>('all');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('loyalty_transactions')
      .select('*, customer:customers(full_name, phone, email)')
      .order('created_at', { ascending: false })
      .limit(100);
    setHistory((data || []) as typeof history);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filtered = history.filter((h) => {
    if (filter === 'earned') return h.points > 0;
    if (filter === 'spent') return h.points < 0;
    return true;
  });

  const totalEarned = history.filter((h) => h.points > 0).reduce((s, h) => s + h.points, 0);
  const totalSpent = history.filter((h) => h.points < 0).reduce((s, h) => s + h.points, 0);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">إجمالي النقاط المكتسبة</p>
          <p className="text-2xl font-black" style={{ color: settings.accent_color }}>{totalEarned}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">النقاط المستهلكة</p>
          <p className="text-2xl font-black text-red-500">{totalSpent}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">عدد العمليات</p>
          <p className="text-2xl font-black text-gray-900">{history.length}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {(['all', 'earned', 'spent'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              filter === f ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
            style={filter === f ? { backgroundColor: settings.primary_color } : {}}
          >
            {f === 'all' ? 'الكل' : f === 'earned' ? 'مكتسبة' : 'مستهلكة'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Sparkles className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">لا توجد حركات نقاط بعد — النقاط تُمنح تلقائياً مع كل طلب ناجح</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {filtered.map((tx, i) => (
            <div key={tx.id} className={`flex items-center gap-3 p-3.5 ${i !== 0 ? 'border-t border-gray-50' : ''} flex-wrap`}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${tx.points > 0 ? settings.accent_color : '#ef4444'}15` }}>
                <Sparkles className="w-4 h-4" style={{ color: tx.points > 0 ? settings.accent_color : '#ef4444' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{tx.reason}</p>
                <p className="text-[11px] text-gray-400 truncate">
                  {tx.customer?.full_name || 'عميل'} • {tx.customer?.phone || tx.customer?.email || 'بدون بيانات'} • {new Date(tx.created_at).toLocaleDateString('ar-EG')}
                </p>
              </div>
              <span className={`text-sm font-black ${tx.points > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                {tx.points > 0 ? `+${tx.points}` : tx.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Settings Tab
// ============================================
function SettingsTab() {
  const { settings, refresh, themeColors } = useSettings();
  const [form, setForm] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const settingsNav = [
    { id: 'identity', label: 'الهوية والواجهة', icon: <Cross className="w-4 h-4" /> },
    { id: 'header', label: 'الهيدر', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'hero', label: 'القسم الرئيسي (Hero)', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'howItWorks', label: 'كيف تعمل المنصة', icon: <List className="w-4 h-4" /> },
    { id: 'payment', label: 'الدفع والشحن', icon: <Wallet className="w-4 h-4" /> },
    { id: 'content', label: 'المحتوى والأقسام', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'features', label: 'الميزات والولاء', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'contact', label: 'التواصل', icon: <Phone className="w-4 h-4" /> },
    { id: 'footer', label: 'التذييل (Footer)', icon: <Globe className="w-4 h-4" /> },
  ] as const;
  type SettingsTabKey = (typeof settingsNav)[number]['id'];
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsTabKey>('identity');

// Initialize colors state
  const [colors, setColors] = useState<ThemeColors>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.themeColors) {
          return { ...DEFAULT_THEME_COLORS, ...parsed.themeColors };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...DEFAULT_THEME_COLORS };
  });

  // Initialize header config state
  const [headerCfg, setHeaderCfg] = useState(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.headerConfig) {
          return { ...DEFAULT_HEADER_CONFIG, ...parsed.headerConfig };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...DEFAULT_HEADER_CONFIG };
  });

  // Initialize footer config state
  const [footerCfg, setFooterCfg] = useState<FooterConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.footerConfig) {
          return { ...DEFAULT_FOOTER_CONFIG, ...parsed.footerConfig };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...DEFAULT_FOOTER_CONFIG };
  });

  // Initialize payment config state
  const [paymentCfg, setPaymentCfg] = useState(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.paymentConfig) {
          return { ...DEFAULT_PAYMENT_CONFIG, ...parsed.paymentConfig };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...DEFAULT_PAYMENT_CONFIG };
  });

  // Initialize hero config state
  const [heroCfg, setHeroCfg] = useState<HeroConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.heroConfig) {
          const merged = { ...DEFAULT_HERO_CONFIG, ...parsed.heroConfig };
          return merged;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...DEFAULT_HERO_CONFIG };
  });

  // Initialize how-it-works config state
  const [howCfg, setHowCfg] = useState<HowItWorksConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.howItWorksConfig) {
          return { ...DEFAULT_HOW_IT_WORKS_CONFIG, ...parsed.howItWorksConfig };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...DEFAULT_HOW_IT_WORKS_CONFIG };
  });

  // Initialize loyalty config state
  const [loyaltyCfg, setLoyaltyCfg] = useState<LoyaltyConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.loyaltyConfig) {
          return { ...DEFAULT_LOYALTY_CONFIG, ...parsed.loyaltyConfig };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...DEFAULT_LOYALTY_CONFIG };
  });

  // Initialize features config state
  const [featuresCfg, setFeaturesCfg] = useState<FeaturesConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.featuresConfig) {
          return { ...DEFAULT_FEATURES_CONFIG, ...parsed.featuresConfig };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...DEFAULT_FEATURES_CONFIG };
  });

  // Initialize homepage config state
  const [homepageCfg, setHomepageCfg] = useState<HomepageConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.homepageConfig) {
          return { ...DEFAULT_HOMEPAGE_CONFIG, ...parsed.homepageConfig };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...DEFAULT_HOMEPAGE_CONFIG };
  });

  // Initialize welcome popup config state (Bug 4 fix: read from features_json not defaults)
  const { welcomeConfig: ctxWelcome } = useSettings();
  const [welcomeCfgLocal] = useState<WelcomePopupConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.welcomeConfig) {
          return { ...ctxWelcome, ...parsed.welcomeConfig };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...ctxWelcome };
  });

  // Sync colors with site settings colors
  useEffect(() => {
    setColors(prev => ({
      ...prev,
      primaryColor: form.primary_color,
      secondaryColor: form.secondary_color,
      accentColor: form.accent_color
    }));
  }, [form.primary_color, form.secondary_color, form.accent_color]);

  // Re-sync form with loaded settings if it mounted before settings arrived
  useEffect(() => {
    if (settings.id && form.id === '') {
      setForm(settings);
    }
  }, [settings, form.id]);

  const handleSave = async () => {
    if (!form.id) {
      showToast('تعذر الحفظ — لم يتم تحميل الإعدادات بعد، أعد المحاولة بعد قليل');
      return;
    }
    setSaving(true);
    
// Save colors and header config inside features_json
    let existingStoreConfig = { ...DEFAULT_STORE_CONFIG };
    try {
      const p = settings.features_json ? JSON.parse(settings.features_json) : {};
      if (p && p.storeConfig) existingStoreConfig = { ...DEFAULT_STORE_CONFIG, ...p.storeConfig };
    } catch (e) {
      console.error(e);
    }
    const updatedFeaturesJson = JSON.stringify({
      themeColors: colors,
      headerConfig: headerCfg,
      footerConfig: footerCfg,
      paymentConfig: paymentCfg,
      heroConfig: heroCfg,
      howItWorksConfig: howCfg,
      storeConfig: existingStoreConfig,
      homepageConfig: homepageCfg,
      loyaltyConfig: loyaltyCfg,
      featuresConfig: featuresCfg,
      welcomeConfig: welcomeCfgLocal,  // Bug 1 fix: preserve welcomeConfig on every save
    });

    const basePayload = {
      site_name: form.site_name,
      site_tagline: form.site_tagline,
      site_description: form.site_description,
      logo_url: form.logo_url,
      primary_color: colors.primaryColor,
      secondary_color: colors.secondaryColor,
      accent_color: colors.accentColor,
      contact_phone: form.contact_phone,
      contact_email: form.contact_email,
      contact_whatsapp: form.contact_whatsapp,
      contact_address: form.contact_address,
      footer_text: form.footer_text,
      hero_title: form.hero_title,
      hero_subtitle: form.hero_subtitle,
      facebook_url: form.facebook_url,
      instagram_url: form.instagram_url,
      twitter_url: form.twitter_url,
      about_title: form.about_title,
      about_text: form.about_text,
      announcement_text: form.announcement_text,
      announcement_active: form.announcement_active,
      features_json: updatedFeaturesJson,
      updated_at: new Date().toISOString(),
    };

    const englishPayload = {
      site_name_en: form.site_name_en || null,
      site_tagline_en: form.site_tagline_en || null,
      site_description_en: form.site_description_en || null,
      hero_title_en: form.hero_title_en || null,
      hero_subtitle_en: form.hero_subtitle_en || null,
      footer_text_en: form.footer_text_en || null,
      announcement_text_en: form.announcement_text_en || null,
      about_title_en: form.about_title_en || null,
      about_text_en: form.about_text_en || null,
      contact_address_en: form.contact_address_en || null,
    };

    const isMissingColumnError = (e: { code?: string; message?: string } | null) =>
      !!e && (e.code === '42703' || /column .* does not exist/i.test(e.message || ''));

    let saveError = (
      await supabase.from('site_settings').update({ ...basePayload, ...englishPayload }).eq('id', form.id)
    ).error;

    if (isMissingColumnError(saveError)) {
      saveError = (await supabase.from('site_settings').update(basePayload).eq('id', form.id)).error;
      if (!saveError) {
        showToast('تم الحفظ — لكن أعمدة الترجمة الإنجليزية غير منشأة بعد في قاعدة البيانات، شغّل ملف الترحيل settings_text_en.sql لتفعيلها');
      }
    }

    setSaving(false);
    if (saveError) {
      showToast(translateError(saveError.message).ar || 'تعذر حفظ الإعدادات، حاول مرة أخرى');
      return;
    }
    setSaved(true);
    refresh();
    setTimeout(() => setSaved(false), 2000);
  };


  return (
    <div className="space-y-6">
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">تم حفظ الإعدادات والألوان بنجاح</span>
        </div>
      )}

      {/* Sub navigation */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-gray-900 text-white flex items-center justify-center">
              <Settings className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-black text-gray-800">إعدادات الموقع</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 hidden sm:block">اختر القسم الذي تريد تعديله</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none p-2">
          {settingsNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setSettingsSubTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                settingsSubTab === item.id
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className={settingsSubTab === item.id ? 'text-teal-300' : 'text-gray-400'}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {settingsSubTab === 'identity' && (
        <div className="space-y-6">
          <SettingsSection title="هوية الموقع الأساسية" icon={<Cross className="w-5 h-5" />}>
            <Field label="اسم الموقع"><input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} className={inputClass} /></Field>
            <Field label="اسم الموقع (English)"><input value={form.site_name_en || ''} onChange={(e) => setForm({ ...form, site_name_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Site name" /></Field>
            <Field label="الشعار النصي (Tagline)"><input value={form.site_tagline} onChange={(e) => setForm({ ...form, site_tagline: e.target.value })} className={inputClass} /></Field>
            <Field label="الشعار النصي (English)"><input value={form.site_tagline_en || ''} onChange={(e) => setForm({ ...form, site_tagline_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Tagline" /></Field>
            <Field label="وصف الموقع"><textarea value={form.site_description || ''} onChange={(e) => setForm({ ...form, site_description: e.target.value })} className={inputClass} rows={2} /></Field>
            <Field label="وصف الموقع (English)"><textarea value={form.site_description_en || ''} onChange={(e) => setForm({ ...form, site_description_en: e.target.value })} className={inputClass} rows={2} dir="ltr" placeholder="Site description" /></Field>
            <ImageUrlField label="شعار الموقع (Logo)" value={form.logo_url || ''} onChange={(v) => setForm({ ...form, logo_url: v })} />
          </SettingsSection>

<SettingsSection title="القسم الرئيسي (Hero)" icon={<LayoutDashboard className="w-5 h-5" />}>
            <Field label="العنوان الرئيسي"><input value={form.hero_title} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} className={inputClass} /></Field>
            <Field label="العنوان الرئيسي (English)"><input value={form.hero_title_en || ''} onChange={(e) => setForm({ ...form, hero_title_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Hero title" /></Field>
            <Field label="النص الفرعي"><textarea value={form.hero_subtitle} onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })} className={inputClass} rows={2} /></Field>
            <Field label="النص الفرعي (English)"><textarea value={form.hero_subtitle_en || ''} onChange={(e) => setForm({ ...form, hero_subtitle_en: e.target.value })} className={inputClass} rows={2} dir="ltr" placeholder="Hero subtitle" /></Field>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'header' && (
        <div className="space-y-6">
          {/* HEADER TOP BAR CONFIG */}
          <SettingsSection title="شريط الهيدر العلوي" icon={<Megaphone className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              التحكم في عناصر الشريط العلوي للهيدر ("التوصيل إلى" و"خدمة 24/7") — إظهار/إخفاء وتعديل النصوص.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <Toggle
                checked={headerCfg.showTopBar}
                onChange={(v) => setHeaderCfg({ ...headerCfg, showTopBar: v })}
                label="إظهار الشريط العلوي بالكامل"
                hint="عند إيقافه يختفي الشريط كله (الموقع + رقم الهاتف + الروشتة)"
              />
              <Toggle
                checked={headerCfg.showContactPhone}
                onChange={(v) => setHeaderCfg({ ...headerCfg, showContactPhone: v })}
                label="إظهار رقم الهاتف في الشريط"
                hint="عرض/إخفاء رقم التواصل داخل الشريط العلوي"
              />
            </div>

            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-800">عنصر "التوصيل إلى" (الموقع)</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={headerCfg.showLocationBar}
                      onChange={(e) => setHeaderCfg({ ...headerCfg, showLocationBar: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs text-gray-600">ظاهر</span>
                  </label>
                </div>
                <Field label="نص الموقع الافتراضي">
                  <input
                    value={headerCfg.locationText}
                    onChange={(e) => setHeaderCfg({ ...headerCfg, locationText: e.target.value })}
                    className={inputClass}
                    placeholder="مثال: القاهرة - المعادي"
                  />
                </Field>
                <Field label="نص الموقع الافتراضي (English)">
                  <input
                    value={headerCfg.locationText_en || ''}
                    onChange={(e) => setHeaderCfg({ ...headerCfg, locationText_en: e.target.value })}
                    className={inputClass}
                    dir="ltr"
                    placeholder="e.g. Cairo - Maadi"
                  />
                </Field>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-800">عنصر "خدمة 24/7" (شريط الخدمة)</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={headerCfg.showServiceBar}
                      onChange={(e) => setHeaderCfg({ ...headerCfg, showServiceBar: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs text-gray-600">ظاهر</span>
                  </label>
                </div>
                <Field label="نص شريط الخدمة">
                  <input
                    value={headerCfg.serviceText}
                    onChange={(e) => setHeaderCfg({ ...headerCfg, serviceText: e.target.value })}
                    className={inputClass}
                    placeholder="مثال: خدمة 24/7 طوارئ ودعم صيدلي مباشر"
                  />
                </Field>
                <Field label="نص شريط الخدمة (English)">
                  <input
                    value={headerCfg.serviceText_en || ''}
                    onChange={(e) => setHeaderCfg({ ...headerCfg, serviceText_en: e.target.value })}
                    className={inputClass}
                    dir="ltr"
                    placeholder="e.g. 24/7 emergency pharmacy support"
                  />
                </Field>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-gray-800">عنصر "رفع روشتة طبية"</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={headerCfg.showPrescriptionBar}
                      onChange={(e) => setHeaderCfg({ ...headerCfg, showPrescriptionBar: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs text-gray-600">ظاهر</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  إظهار/إخفاء زر "رفع روشتة طبية" في الشريط العلوي وزر الموبايل، وتغيير لونه بالكامل.
                </p>
                <Field label="لون زر رفع الروشتة">
                  <input
                    type="color"
                    value={headerCfg.prescriptionBarColor}
                    onChange={(e) => setHeaderCfg({ ...headerCfg, prescriptionBarColor: e.target.value })}
                    className="w-full h-11 rounded-xl border border-gray-200 cursor-pointer p-1"
                  />
                </Field>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-gray-800">شريط الهيدر العلوي (الخلفية)</label>
                </div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  لون الشريط الكامل الذي يحتوي عناصر "التوصيل إلى" و"خدمة 24/7" و"رفع روشتة طبية" وأرقام التواصل.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="لون خلفية الشريط">
                    <input
                      type="color"
                      value={headerCfg.topBarColor}
                      onChange={(e) => setHeaderCfg({ ...headerCfg, topBarColor: e.target.value })}
                      className="w-full h-11 rounded-xl border border-gray-200 cursor-pointer p-1"
                    />
                  </Field>
                  <Field label="لون نصوص الشريط">
                    <input
                      type="color"
                      value={headerCfg.topBarTextColor}
                      onChange={(e) => setHeaderCfg({ ...headerCfg, topBarTextColor: e.target.value })}
                      className="w-full h-11 rounded-xl border border-gray-200 cursor-pointer p-1"
                    />
                  </Field>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* HEADER FEATURES TOGGLES */}
          <SettingsSection title="ميزات الهيدر" icon={<Zap className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              تحكم في عناصر البحث وشريط الهيدر — مفاتيح جاهزة للإظهار والإخفاء.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle
                checked={headerCfg.showVoiceSearch}
                onChange={(v) => setHeaderCfg({ ...headerCfg, showVoiceSearch: v })}
                label="البحث الصوتي"
                hint="أيقونة الميكروفون بجانب حقل البحث"
              />
              <Toggle
                checked={headerCfg.showBarcode}
                onChange={(v) => setHeaderCfg({ ...headerCfg, showBarcode: v })}
                label="ماسح الباركود"
                hint="زر الباركود في حقل البحث"
              />
              <Toggle
                checked={headerCfg.showTrendingTags}
                onChange={(v) => setHeaderCfg({ ...headerCfg, showTrendingTags: v })}
                label="الكلمات الأكثر بحثاً"
                hint="شريط الأكثر طلباً أسفل الهيدر"
              />
              <Toggle
                checked={headerCfg.showWhatsAppButton}
                onChange={(v) => setHeaderCfg({ ...headerCfg, showWhatsAppButton: v })}
                label="زر واتساب المباشر"
                hint="زر التواصل عبر واتساب في الهيدر"
              />
              <Toggle
                checked={headerCfg.showCategoryPills}
                onChange={(v) => setHeaderCfg({ ...headerCfg, showCategoryPills: v })}
                label="شريط التصنيفات السريع"
                hint="أزرار التصنيفات الملونة أسفل الهيدر"
              />
            </div>

            {headerCfg.showTrendingTags && (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                <label className="text-xs font-bold text-gray-800 block">طريقة شريط "الأكثر طلباً"</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHeaderCfg({ ...headerCfg, trendingMode: 'auto' })}
                    className={`rounded-2xl border-2 p-4 text-start transition-all ${headerCfg.trendingMode === 'auto' ? 'shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    style={headerCfg.trendingMode === 'auto' ? { borderColor: settings.primary_color, backgroundColor: `${settings.primary_color}0a` } : {}}
                  >
                    <p className="text-sm font-extrabold text-gray-900">تلقائي (من الأكثر بحثاً فعلياً)</p>
                    <p className="text-[11px] text-gray-500 mt-1">يعرض تلقائياً الكلمات الأكثر بحثاً من العملاء، ويحدث بمرور الوقت.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeaderCfg({ ...headerCfg, trendingMode: 'manual' })}
                    className={`rounded-2xl border-2 p-4 text-start transition-all ${headerCfg.trendingMode === 'manual' ? 'shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    style={headerCfg.trendingMode === 'manual' ? { borderColor: settings.primary_color, backgroundColor: `${settings.primary_color}0a` } : {}}
                  >
                    <p className="text-sm font-extrabold text-gray-900">كلمات ثابتة (تحكم كامل)</p>
                    <p className="text-[11px] text-gray-500 mt-1">اكتب الكلمات التي تريدها كما هي، وعدّل أو أضف في أي وقت.</p>
                  </button>
                </div>

                {headerCfg.trendingMode === 'manual' ? (
                  <Field label="كلمات شريط الأكثر طلباً (افصل بينها بفاصلة)">
                    <textarea
                      value={headerCfg.trendingKeywords.join('، ')}
                      onChange={(e) => setHeaderCfg({ ...headerCfg, trendingKeywords: e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean) })}
                      className={inputClass}
                      rows={3}
                    />
                  </Field>
                ) : (
                  <div>
                    <Field label="الكلمات الاحتياطية (تظهر إن لم توجد بيانات بحث بعد)">
                      <textarea
                        value={headerCfg.trendingKeywords.join('، ')}
                        onChange={(e) => setHeaderCfg({ ...headerCfg, trendingKeywords: e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean) })}
                        className={inputClass}
                        rows={2}
                      />
                    </Field>
                  </div>
                )}

                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {headerCfg.trendingMode === 'auto'
                    ? 'في الوضع التلقائي تُسجّل كل كلمة يبحث عنها العملاء وتظهر الأكثر تكراراً (حتى 7 كلمات). إن لم توجد بيانات بعد، تظهر الكلمات الاحتياطية.'
                    : `سيظهر في الشريط: ${headerCfg.trendingKeywords.length > 0 ? headerCfg.trendingKeywords.join('، ') : 'لا توجد كلمات بعد — أضفها من الأعلى.'}`}
                </p>
              </div>
            )}
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'hero' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${settings.primary_color}15`, color: settings.primary_color }}>
                    <Sparkles className="w-4 h-4" />
                  </span>
                  لوحة التحكم الكاملة في القسم الرئيسي (Hero)
                </h3>
                <p className="text-xs text-gray-500 mt-1.5">
                  تحكم في نصوص وأزرار وأرقام القسم الأول للرئيسية — ثم احفظ من الأسفل.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('هل أنت متأكد من إعادة تعيين إعدادات القسم الرئيسي إلى الافتراضي؟')) {
                    setHeroCfg({ ...DEFAULT_HERO_CONFIG });
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all"
              >
                إعادة تعيين الافتراضي
              </button>
            </div>
          </div>

          <SettingsSection title="أقسام الهيرو" icon={<LayoutDashboard className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              مفاتيح إظهار/إخفاء لكل عنصر في القسم الرئيسي.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle checked={heroCfg.showSearch} onChange={(v) => setHeroCfg({ ...heroCfg, showSearch: v })} label="صندوق البحث" hint="شريط البحث الرئيسي في الهيرو" />
              <Toggle checked={heroCfg.showTrending} onChange={(v) => setHeroCfg({ ...heroCfg, showTrending: v })} label="الكلمات الأكثر بحثاً" hint="الأكثر بحثاً أسفل صندوق البحث" />
              <Toggle checked={heroCfg.showPrescriptionButton} onChange={(v) => setHeroCfg({ ...heroCfg, showPrescriptionButton: v })} label="زر رفع الروشتة" hint="زر رفع الروشتة الطبية" />
              <Toggle checked={heroCfg.showLocationButton} onChange={(v) => setHeroCfg({ ...heroCfg, showLocationButton: v })} label="زر تحديد الموقع" hint="زر تحديد الموقع لإيجاد أقرب الصيدليات" />
            </div>
          </SettingsSection>

          <SettingsSection title="نصوص الهيرو" icon={<FileText className="w-5 h-5" />}>
            <div className="space-y-4">
              <Field label="نص البحث الافتراضي (Placeholder)">
                <input value={heroCfg.searchPlaceholder} onChange={(e) => setHeroCfg({ ...heroCfg, searchPlaceholder: e.target.value })} className={inputClass} />
              </Field>
              <Field label="نص البحث الافتراضي (English)">
                <input value={heroCfg.searchPlaceholder_en || ''} onChange={(e) => setHeroCfg({ ...heroCfg, searchPlaceholder_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Placeholder" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="نص زر رفع الروشتة">
                  <input value={heroCfg.prescriptionButtonText} onChange={(e) => setHeroCfg({ ...heroCfg, prescriptionButtonText: e.target.value })} className={inputClass} />
                </Field>
                <Field label="نص زر رفع الروشتة (English)">
                  <input value={heroCfg.prescriptionButtonText_en || ''} onChange={(e) => setHeroCfg({ ...heroCfg, prescriptionButtonText_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Upload prescription" />
                </Field>
                <Field label="نص زر تحديد الموقع">
                  <input value={heroCfg.locationButtonText} onChange={(e) => setHeroCfg({ ...heroCfg, locationButtonText: e.target.value })} className={inputClass} />
                </Field>
                <Field label="نص زر تحديد الموقع (English)">
                  <input value={heroCfg.locationButtonText_en || ''} onChange={(e) => setHeroCfg({ ...heroCfg, locationButtonText_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Set location" />
                </Field>
              </div>
              <Field label="نص بعد تحديد الموقع">
                <input value={heroCfg.locationSetText} onChange={(e) => setHeroCfg({ ...heroCfg, locationSetText: e.target.value })} className={inputClass} />
              </Field>
              <Field label="نص بعد تحديد الموقع (English)">
                <input value={heroCfg.locationSetText_en || ''} onChange={(e) => setHeroCfg({ ...heroCfg, locationSetText_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Location set" />
              </Field>
              <Field label="عنوان قائمة الأكثر بحثاً">
                <input value={heroCfg.trendingLabel} onChange={(e) => setHeroCfg({ ...heroCfg, trendingLabel: e.target.value })} className={inputClass} />
              </Field>
              <Field label="عنوان قائمة الأكثر بحثاً (English)">
                <input value={heroCfg.trendingLabel_en || ''} onChange={(e) => setHeroCfg({ ...heroCfg, trendingLabel_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Trending now:" />
              </Field>
              <Field label="كلمات الأكثر بحثاً (افصل بينها بفاصلة)">
                <textarea
                  value={heroCfg.trendingKeywords.join('، ')}
                  onChange={(e) => setHeroCfg({ ...heroCfg, trendingKeywords: e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean) })}
                  className={inputClass}
                  rows={2}
                />
              </Field>
            </div>
          </SettingsSection>

        </div>
      )}
      {settingsSubTab === 'howItWorks' && (
        <div className="space-y-6">
          <SettingsSection title="قسم «كيف تعمل المنصة؟»" icon={<List className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              صندوق الخطوات الأربع (ابحث - قارن - اطلب - استلم) في الصفحة الرئيسية. فعّل المفتاح لإظهاره في الموقع أو أوقفه لإخفائه تماماً، وعدّل نصوصه من هنا.
            </p>

            <div className="space-y-3 mb-5">
              <Toggle
                checked={howCfg.enabled}
                onChange={(v) => setHowCfg({ ...howCfg, enabled: v })}
                label="إظهار القسم في الصفحة الرئيسية"
                hint="عند إيقافه يختفي صندوق الخطوات الأربع نهائياً من الموقع"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="النص العلوي (الشارة)">
                <input value={howCfg.badge} onChange={(e) => setHowCfg({ ...howCfg, badge: e.target.value })} className={inputClass} />
              </Field>
              <Field label="النص العلوي (English)">
                <input value={howCfg.badge_en || ''} onChange={(e) => setHowCfg({ ...howCfg, badge_en: e.target.value })} className={inputClass} dir="ltr" />
              </Field>
              <Field label="العنوان الرئيسي">
                <input value={howCfg.title} onChange={(e) => setHowCfg({ ...howCfg, title: e.target.value })} className={inputClass} />
              </Field>
              <Field label="العنوان الرئيسي (English)">
                <input value={howCfg.title_en || ''} onChange={(e) => setHowCfg({ ...howCfg, title_en: e.target.value })} className={inputClass} dir="ltr" />
              </Field>
              <Field label="العنوان الفرعي">
                <input value={howCfg.subtitle} onChange={(e) => setHowCfg({ ...howCfg, subtitle: e.target.value })} className={inputClass} />
              </Field>
              <Field label="العنوان الفرعي (English)">
                <input value={howCfg.subtitle_en || ''} onChange={(e) => setHowCfg({ ...howCfg, subtitle_en: e.target.value })} className={inputClass} dir="ltr" />
              </Field>
            </div>
          </SettingsSection>

          <SettingsSection title="نصوص الخطوات الأربع" icon={<List className="w-5 h-5" />}>
            <div className="space-y-4">
              {howCfg.steps.map((step, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs font-bold text-gray-600 mb-3 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: themeColors.primaryColor }}>
                      {i + 1}
                    </span>
                    الخطوة {i + 1}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={step.title}
                      onChange={(e) => setHowCfg({ ...howCfg, steps: howCfg.steps.map((s, j) => (j === i ? { ...s, title: e.target.value } : s)) })}
                      className={inputClass}
                      placeholder="عنوان الخطوة"
                    />
                    <input
                      value={step.title_en || ''}
                      onChange={(e) => setHowCfg({ ...howCfg, steps: howCfg.steps.map((s, j) => (j === i ? { ...s, title_en: e.target.value } : s)) })}
                      className={inputClass}
                      dir="ltr"
                      placeholder="Step title (EN)"
                    />
                    <input
                      value={step.desc}
                      onChange={(e) => setHowCfg({ ...howCfg, steps: howCfg.steps.map((s, j) => (j === i ? { ...s, desc: e.target.value } : s)) })}
                      className={inputClass}
                      placeholder="وصف الخطوة"
                    />
                    <input
                      value={step.desc_en || ''}
                      onChange={(e) => setHowCfg({ ...howCfg, steps: howCfg.steps.map((s, j) => (j === i ? { ...s, desc_en: e.target.value } : s)) })}
                      className={inputClass}
                      dir="ltr"
                      placeholder="Step description (EN)"
                    />
                  </div>
                </div>
              ))}
            </div>
          </SettingsSection>
        </div>
      )}


      {settingsSubTab === 'payment' && (
        <div className="space-y-6">
          <SettingsSection title="طرق الدفع الإلكتروني" icon={<Wallet className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              أرقام الحسابات أو الروابط التي تظهر للعميل عند طلب منتج لإتمام التحويل. يقوم العميل باختيار طريقة الدفع ويرفع صورة إثبات التحويل، ثم تقوم أنت بتأكيد الطلب من صفحة "طلبات العملاء".
            </p>
            <Field label="رقم فودافون كاش *">
              <input
                value={paymentCfg.vodafoneCash}
                onChange={(e) => setPaymentCfg({ ...paymentCfg, vodafoneCash: e.target.value })}
                className={inputClass}
                dir="ltr"
                placeholder="مثال: 01000000000"
              />
            </Field>
            <Field label="رقم / معرف انستا باي *">
              <input
                value={paymentCfg.instapay}
                onChange={(e) => setPaymentCfg({ ...paymentCfg, instapay: e.target.value })}
                className={inputClass}
                dir="ltr"
                placeholder="مثال: @username أو رقم الهاتف"
              />
            </Field>
          </SettingsSection>

          <SettingsSection title="التوصيل والشحن" icon={<Truck className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              قيم تُعرض للعميل عند الطلب لتوضيح رسوم التوصيل والدفع عند الاستلام.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="رسوم التوصيل الافتراضية (ج.م)">
                <input
                  value={paymentCfg.deliveryFee}
                  onChange={(e) => setPaymentCfg({ ...paymentCfg, deliveryFee: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                  type="number"
                  min="0"
                  placeholder="مثال: 25"
                />
              </Field>
              <Field label="التوصيل المجاني للطلبات فوق (ج.م)">
                <input
                  value={paymentCfg.freeDeliveryThreshold}
                  onChange={(e) => setPaymentCfg({ ...paymentCfg, freeDeliveryThreshold: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                  type="number"
                  min="0"
                  placeholder="مثال: 300"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="رسوم الدفع عند الاستلام (ج.م)">
                <input
                  value={paymentCfg.cashOnDeliveryFee}
                  onChange={(e) => setPaymentCfg({ ...paymentCfg, cashOnDeliveryFee: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                  type="number"
                  min="0"
                  placeholder="مثال: 10"
                />
              </Field>
              <div className="flex items-end">
                <Toggle
                  checked={paymentCfg.showCashOnDelivery}
                  onChange={(v) => setPaymentCfg({ ...paymentCfg, showCashOnDelivery: v })}
                  label="إظهار الدفع عند الاستلام"
                  hint="خيار الدفع كاش عند الاستلام للعميل"
                />
              </div>
            </div>
            <Field label="ملاحظة التوصيل الظاهرة للعميل">
              <textarea
                value={paymentCfg.shippingNote}
                onChange={(e) => setPaymentCfg({ ...paymentCfg, shippingNote: e.target.value })}
                className={inputClass}
                rows={2}
              />
            </Field>
          </SettingsSection>

          <SettingsSection title="كيفية عمل النظام" icon={<ShieldCheck className="w-5 h-5" />}>
            <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <p className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0 text-teal-500" /> العميل يختار الصيدلية التي يريد الطلب منها وطريقة الدفع، ثم يرفع صورة إثبات التحويل.</p>
              <p className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0 text-teal-500" /> تصل الطلبات الجديدة إلى تبويب "طلبات العملاء" في لوحة التحكم بحالة "قيد المراجعة".</p>
              <p className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0 text-teal-500" /> بعد التحقق من إثبات التحويل تقوم بتأكيد الطلب "تم تأكيد الدفع"، ثم "تم الشحن - في الطريق"، ثم "تم التسليم".</p>
              <p className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0 text-teal-500" /> يرى العميل تحديث الحالة فورياً في صفحة "طلباتي ومتابعة الشحنات" من حسابه.</p>
            </div>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'content' && (
        <div className="space-y-6">
          <SettingsSection title="قسم من نحن" icon={<Users className="w-5 h-5" />}>
            <Field label="عنوان القسم"><input value={form.about_title || ''} onChange={(e) => setForm({ ...form, about_title: e.target.value })} className={inputClass} /></Field>
            <Field label="عنوان القسم (English)"><input value={form.about_title_en || ''} onChange={(e) => setForm({ ...form, about_title_en: e.target.value })} className={inputClass} dir="ltr" placeholder="About title" /></Field>
            <Field label="نص القسم"><textarea value={form.about_text || ''} onChange={(e) => setForm({ ...form, about_text: e.target.value })} className={inputClass} rows={3} /></Field>
            <Field label="نص القسم (English)"><textarea value={form.about_text_en || ''} onChange={(e) => setForm({ ...form, about_text_en: e.target.value })} className={inputClass} rows={3} dir="ltr" placeholder="About text" /></Field>
          </SettingsSection>

          <SettingsSection title="قسم الصيدليات في الصفحة الرئيسية" icon={<Store className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              العنوان والنص الفرعي اللذان يظهران أعلى قسم الصيدليات في الصفحة الرئيسية للموقع.
            </p>
            <Field label="العنوان الرئيسي للقسم"><input value={homepageCfg.pharmaciesTitle} onChange={(e) => setHomepageCfg({ ...homepageCfg, pharmaciesTitle: e.target.value })} className={inputClass} placeholder="مثال: الصيدليات المتاحة بجوارك" /></Field>
            <Field label="العنوان الرئيسي للقسم (English)"><input value={homepageCfg.pharmaciesTitle_en || ''} onChange={(e) => setHomepageCfg({ ...homepageCfg, pharmaciesTitle_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Pharmacies near you" /></Field>
            <Field label="النص الفرعي للقسم"><input value={homepageCfg.pharmaciesSubtitle} onChange={(e) => setHomepageCfg({ ...homepageCfg, pharmaciesSubtitle: e.target.value })} className={inputClass} placeholder="مثال: تصفح الصيدليات حسب تصنيف احتياجك" /></Field>
            <Field label="النص الفرعي للقسم (English)"><input value={homepageCfg.pharmaciesSubtitle_en || ''} onChange={(e) => setHomepageCfg({ ...homepageCfg, pharmaciesSubtitle_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Browse pharmacies by your needs" /></Field>
          </SettingsSection>

          <SettingsSection title="شريط الثقة (لماذا تثق بنا؟)" icon={<ShieldCheck className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              كروت الثقة التي تظهر في الصفحة الرئيسية (صيدليات مرخصة، توصيل أقل من 30 دقيقة، ضمان الأصالة...). يمكنك إخفاء القسم بالكامل أو إظهار/إخفاء كل كارت على حدة بمفتاح التشغيل.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FeatureToggle
                icon={<ShieldCheck className="w-4 h-4" />}
                title="إظهار قسم كروت الثقة"
                desc="إظهار أو إخفاء القسم كاملاً في الصفحة الرئيسية"
                checked={homepageCfg.trust.showSection}
                onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, showSection: v } })}
                color={settings.primary_color}
              />
              <FeatureToggle
                icon={<Star className="w-4 h-4" />}
                title="الشريط السفلي للثقة"
                desc="الشريط الصغير أسفل الكروت (توصيل آمن، استرداد كامل...)"
                checked={homepageCfg.trust.showBottomBar}
                onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, showBottomBar: v } })}
                color={settings.primary_color}
              />
              <FeatureToggle
                icon={<Shield className="w-4 h-4" />}
                title="كارت: صيدليات مرخّصة 100%"
                desc="جميع الصيدليات الشريكة معتمدة من هيئة الدواء"
                checked={homepageCfg.trust.cards.licensed}
                onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, cards: { ...homepageCfg.trust.cards, licensed: v } } })}
                color={settings.primary_color}
              />
              <FeatureToggle
                icon={<ShieldCheck className="w-4 h-4" />}
                title="كارت: بيانات آمنة ومشفّرة"
                desc="بيانات العميل محمية بتشفير SSL"
                checked={homepageCfg.trust.cards.secure}
                onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, cards: { ...homepageCfg.trust.cards, secure: v } } })}
                color={settings.primary_color}
              />
              <FeatureToggle
                icon={<Users className="w-4 h-4" />}
                title="كارت: صيادلة معتمدون"
                desc="فريق من الصيادلة المرخّصين يراجع كل طلب"
                checked={homepageCfg.trust.cards.pharmacists}
                onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, cards: { ...homepageCfg.trust.cards, pharmacists: v } } })}
                color={settings.primary_color}
              />
              <FeatureToggle
                icon={<Truck className="w-4 h-4" />}
                title="كارت: توصيل أقل من 30 دقيقة"
                desc="خدمة التوصيل السريع متاحة على مدار الساعة"
                checked={homepageCfg.trust.cards.fastDelivery}
                onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, cards: { ...homepageCfg.trust.cards, fastDelivery: v } } })}
                color={settings.primary_color}
              />
              <FeatureToggle
                icon={<BadgePercent className="w-4 h-4" />}
                title="كارت: ضمان الأصالة 100%"
                desc="جميع المنتجات أصلية ومعتمدة من الجهات الرسمية"
                checked={homepageCfg.trust.cards.authentic}
                onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, cards: { ...homepageCfg.trust.cards, authentic: v } } })}
                color={settings.primary_color}
              />
              <FeatureToggle
                icon={<Phone className="w-4 h-4" />}
                title="كارت: دعم فوري 24/7"
                desc="فريق الدعم متاح دائماً للمساعدة في أي وقت"
                checked={homepageCfg.trust.cards.support}
                onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, cards: { ...homepageCfg.trust.cards, support: v } } })}
                color={settings.primary_color}
              />
            </div>
          </SettingsSection>

          <SettingsSection title="شارات الثقة في الهيرو (أعلى الصفحة الرئيسية)" icon={<Zap className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              الشارات الزجاجية التي تظهر أسفل محتوى قسم الهيرو في الصفحة الرئيسية (توصيل فوري أقل من 30 دقيقة، خصومات وعروض، صيدليات معتمدة...). تحكم كامل في إظهار كل شارة ونصوصها وأيقونتها ولونها.
            </p>
            <FeatureToggle
              icon={<Zap className="w-4 h-4" />}
              title="إظهار شارات الثقة في الهيرو"
              desc="إظهار أو إخفاء شريط الشارات كاملاً أسفل محتوى الهيرو"
              checked={homepageCfg.heroBadges.showBadges}
              onChange={(v) => setHomepageCfg({ ...homepageCfg, heroBadges: { ...homepageCfg.heroBadges, showBadges: v } })}
              color={settings.primary_color}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {homepageCfg.heroBadges.badges.map((badge) => {
                const updateBadge = (patch: Partial<typeof badge>) =>
                  setHomepageCfg({
                    ...homepageCfg,
                    heroBadges: {
                      ...homepageCfg.heroBadges,
                      badges: homepageCfg.heroBadges.badges.map((b) => (b.id === badge.id ? { ...b, ...patch } : b)),
                    },
                  });
                const BadgeIcon = heroBadgeIcon(badge.icon);
                return (
                  <div key={badge.id} className={`p-4 rounded-2xl border-2 space-y-3 transition-colors ${badge.enabled ? 'border-teal-200 bg-teal-50/30' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${badge.color}18`, color: badge.color, border: `1px solid ${badge.color}30` }}
                        >
                          <BadgeIcon className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-gray-900 truncate">{badge.title || 'شارة'}</p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <span className="text-[11px] font-bold text-gray-600">{badge.enabled ? 'ظاهرة' : 'مخفية'}</span>
                        <input
                          type="checkbox"
                          checked={badge.enabled}
                          onChange={(e) => updateBadge({ enabled: e.target.checked })}
                          className="w-4 h-4 accent-teal-500"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      <Field label="العنوان الرئيسي">
                        <input value={badge.title} onChange={(e) => updateBadge({ title: e.target.value })} className={inputClass} placeholder="مثال: توصيل فوري" />
                      </Field>
                      <Field label="العنوان الرئيسي (English)">
                        <input value={badge.title_en || ''} onChange={(e) => updateBadge({ title_en: e.target.value })} className={inputClass} dir="ltr" placeholder="e.g. Fast delivery" />
                      </Field>
                      <Field label="النص الفرعي">
                        <input value={badge.subtitle} onChange={(e) => updateBadge({ subtitle: e.target.value })} className={inputClass} placeholder="مثال: أقل من 30 دقيقة" />
                      </Field>
                      <Field label="النص الفرعي (English)">
                        <input value={badge.subtitle_en || ''} onChange={(e) => updateBadge({ subtitle_en: e.target.value })} className={inputClass} dir="ltr" placeholder="e.g. Under 30 minutes" />
                      </Field>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <Field label="الأيقونة">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${badge.color}18`, color: badge.color }}
                            >
                              <BadgeIcon className="w-5 h-5" />
                            </div>
                            <select value={badge.icon} onChange={(e) => updateBadge({ icon: e.target.value })} className={inputClass}>
                              {Object.keys(HERO_BADGE_ICON_MAP).map((key) => (
                                <option key={key} value={key}>{key}</option>
                              ))}
                            </select>
                          </div>
                        </Field>
                        <ColorField label="لون الأيقونة" value={badge.color} onChange={(v) => updateBadge({ color: v })} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SettingsSection>

          <SettingsSection title="الشريط الإعلاني" icon={<Megaphone className="w-5 h-5" />}>
            <label className="flex items-center gap-2 cursor-pointer mb-3"><input type="checkbox" checked={form.announcement_active} onChange={(e) => setForm({ ...form, announcement_active: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">تفعيل الشريط الإعلاني</span></label>
            <Field label="نص الإعلان"><input value={form.announcement_text || ''} onChange={(e) => setForm({ ...form, announcement_text: e.target.value })} className={inputClass} placeholder="نص الإعلان الذي يظهر أعلى الموقع" /></Field>
            <Field label="نص الإعلان (English)"><input value={form.announcement_text_en || ''} onChange={(e) => setForm({ ...form, announcement_text_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Announcement text" /></Field>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'features' && (
        <div className="space-y-6">
          <SettingsSection title="تفعيل الميزات الرئيسية" icon={<Sparkles className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4">تحكم في إظهار أو إخفاء كل ميزة من الميزات الجديدة على واجهة الموقع.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FeatureToggle
                icon={<Truck className="w-4 h-4" />}
                title="تتبع حالة الطلب"
                desc="شريط تقدم بصري لحالة الطلب + إشعار للعميل عند كل تحديث"
                checked={featuresCfg.orderTracking}
                onChange={(v) => setFeaturesCfg((p) => ({ ...p, orderTracking: v }))}
                color={settings.primary_color}
              />
              <FeatureToggle
                icon={<BellRing className="w-4 h-4" />}
                title="تنبيه توفر الدواء"
                desc="زر نبهني عند التوفر على المنتجات غير المتاحة + إشعار تلقائي عند التوفير"
                checked={featuresCfg.stockAlerts}
                onChange={(v) => setFeaturesCfg((p) => ({ ...p, stockAlerts: v }))}
                color={settings.primary_color}
              />
              <FeatureToggle
                icon={<Bell className="w-4 h-4" />}
                title="تذكير مواعيد الأدوية"
                desc="تبويب تذكير الأدوية في حساب العميل + إشعارات في المواعيد المحددة"
                checked={featuresCfg.reminders}
                onChange={(v) => setFeaturesCfg((p) => ({ ...p, reminders: v }))}
                color={settings.primary_color}
              />
              <FeatureToggle
                icon={<Users className="w-4 h-4" />}
                title="الطلب للعيلة"
                desc="العميل يضيف أفراد عائلته ويحدد كل طلب لمين (تبويب في الحساب + اختيار في إتمام الطلب)"
                checked={featuresCfg.familyMembers}
                onChange={(v) => setFeaturesCfg((p) => ({ ...p, familyMembers: v }))}
                color={settings.primary_color}
              />
              <FeatureToggle
                icon={<Baby className="w-4 h-4" />}
                title="حاسبة جرعات الأطفال"
                desc="أداة تحسب جرعة آمنة من دواء معين حسب عمر ووزن الطفل"
                checked={featuresCfg.doseCalculator}
                onChange={(v) => setFeaturesCfg((p) => ({ ...p, doseCalculator: v }))}
                color={settings.primary_color}
              />
              <FeatureToggle
                icon={<Scale className="w-4 h-4" />}
                title="مقارنة أسعار الدواء"
                desc="زر على كل منتج يعرض نفس الدواء في الصيدليات الأخرى + بدائل بنفس المادة الفعالة مرتبة من الأرخص"
                checked={featuresCfg.priceCompare}
                onChange={(v) => setFeaturesCfg((p) => ({ ...p, priceCompare: v }))}
                color={settings.primary_color}
              />
              <FeatureToggle
                icon={<Scale className="w-4 h-4" />}
                title="مقارنة الصيدليات"
                desc="إضافة الصيدليات لشريط مقارنة أسفل الشاشة وعرضها جنباً لجنب بجدول مفصل"
                checked={featuresCfg.pharmacyCompare}
                onChange={(v) => setFeaturesCfg((p) => ({ ...p, pharmacyCompare: v }))}
                color={settings.primary_color}
              />
            </div>
          </SettingsSection>

          <SettingsSection title="نظام نقاط الولاء" icon={<Sparkles className="w-5 h-5" />}>
            <label className="flex items-center gap-2 cursor-pointer mb-5"><input type="checkbox" checked={loyaltyCfg.enabled} onChange={(e) => setLoyaltyCfg((p) => ({ ...p, enabled: e.target.checked }))} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">تفعيل نظام نقاط الولاء</span></label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={`نقاط لكل طلب (حالياً ${loyaltyCfg.pointsPerOrder})`}>
                <input type="number" min="0" value={loyaltyCfg.pointsPerOrder} onChange={(e) => setLoyaltyCfg((p) => ({ ...p, pointsPerOrder: Math.max(0, parseInt(e.target.value) || 0) }))} className={inputClass} dir="ltr" />
              </Field>
              <Field label={`نقطة لكل (ج.م) — حالياً ${loyaltyCfg.pointsPerPound}`}>
                <input type="number" min="1" value={loyaltyCfg.pointsPerPound} onChange={(e) => setLoyaltyCfg((p) => ({ ...p, pointsPerPound: Math.max(1, parseInt(e.target.value) || 1) }))} className={inputClass} dir="ltr" />
              </Field>
              <Field label={`نقاط الاستبدال — حالياً ${loyaltyCfg.redeemThreshold}`}>
                <input type="number" min="1" value={loyaltyCfg.redeemThreshold} onChange={(e) => setLoyaltyCfg((p) => ({ ...p, redeemThreshold: Math.max(1, parseInt(e.target.value) || 1) }))} className={inputClass} dir="ltr" />
              </Field>
              <Field label={`قيمة الخصم عند الاستبدال (ج.م) — حالياً ${loyaltyCfg.redeemValue}`}>
                <input type="number" min="0" value={loyaltyCfg.redeemValue} onChange={(e) => setLoyaltyCfg((p) => ({ ...p, redeemValue: Math.max(0, parseInt(e.target.value) || 0) }))} className={inputClass} dir="ltr" />
              </Field>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              مثال: {loyaltyCfg.redeemThreshold} نقطة = خصم {loyaltyCfg.redeemValue} ج.م عند الطلب. تظهر هذه القيم للعميل في تبويب "نقاطي ومكافآتي".
            </p>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'contact' && (
        <div className="space-y-6">
          <SettingsSection title="معلومات التواصل" icon={<Phone className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="رقم الهاتف"><input value={form.contact_phone || ''} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className={inputClass} dir="ltr" /></Field>
              <Field label="واتساب"><input value={form.contact_whatsapp || ''} onChange={(e) => setForm({ ...form, contact_whatsapp: e.target.value })} className={inputClass} dir="ltr" /></Field>
            </div>
            <Field label="البريد الإلكتروني"><input value={form.contact_email || ''} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className={inputClass} dir="ltr" /></Field>
            <Field label="العنوان"><input value={form.contact_address || ''} onChange={(e) => setForm({ ...form, contact_address: e.target.value })} className={inputClass} /></Field>
            <Field label="العنوان (English)"><input value={form.contact_address_en || ''} onChange={(e) => setForm({ ...form, contact_address_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Address" /></Field>
          </SettingsSection>

          <SettingsSection title="روابط التواصل الاجتماعي" icon={<Globe className="w-5 h-5" />}>
            <div className="space-y-3">
              <Field label="فيسبوك"><input value={form.facebook_url || ''} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} className={inputClass} dir="ltr" placeholder="https://facebook.com/..." /></Field>
              <Field label="انستجرام"><input value={form.instagram_url || ''} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} className={inputClass} dir="ltr" placeholder="https://instagram.com/..." /></Field>
              <Field label="تويتر / X"><input value={form.twitter_url || ''} onChange={(e) => setForm({ ...form, twitter_url: e.target.value })} className={inputClass} dir="ltr" placeholder="https://x.com/..." /></Field>
            </div>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'footer' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </span>
                  لوحة التحكم الكاملة في التذييل
                </h3>
                <p className="text-xs text-gray-500 mt-1.5">
                  تحكم في أقسام التذييل ونصوصه بالكامل — إظهار/إخفاء وتعديل المحتوى ثم احفظ من الأسفل.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('هل أنت متأكد من إعادة تعيين إعدادات التذييل إلى الافتراضي؟')) {
                    setFooterCfg({ ...DEFAULT_FOOTER_CONFIG });
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all"
              >
                إعادة تعيين الافتراضي
              </button>
            </div>
          </div>

          {/* الأقسام */}
          <SettingsSection title="أقسام التذييل" icon={<LayoutDashboard className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              اختر الأقسام التي تظهر في تذييل الموقع بواسطة مفاتيح الإظهار/الإخفاء الجاهزة.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle
                checked={footerCfg.showNewsletter}
                onChange={(v) => setFooterCfg({ ...footerCfg, showNewsletter: v })}
                label="صندوق النشرة البريدية"
                hint="شريط الاشتراك في النشرة أعلى التذييل"
              />
              <Toggle
                checked={footerCfg.showQuickLinks}
                onChange={(v) => setFooterCfg({ ...footerCfg, showQuickLinks: v })}
                label="قسم الروابط السريعة"
                hint="روابط المنصة الرئيسية"
              />
              <Toggle
                checked={footerCfg.showContactSection}
                onChange={(v) => setFooterCfg({ ...footerCfg, showContactSection: v })}
                label="قسم التواصل والمساعدة"
                hint="الهاتف، الواتساب، البريد والعنوان"
              />
              <Toggle
                checked={footerCfg.showSocialSection}
                onChange={(v) => setFooterCfg({ ...footerCfg, showSocialSection: v })}
                label="قسم وسائل التواصل الاجتماعي"
                hint="أيقونات فيسبوك وانستجرام وتويتر"
              />
              <Toggle
                checked={footerCfg.showTrustBadges}
                onChange={(v) => setFooterCfg({ ...footerCfg, showTrustBadges: v })}
                label="شارات الثقة"
                hint="طبي موثوق، توصيل 24 ساعة، خدمة على مدار اليوم"
              />
              <Toggle
                checked={footerCfg.showBottomNotice}
                onChange={(v) => setFooterCfg({ ...footerCfg, showBottomNotice: v })}
                label="التنبيه الطبي السفلي"
                hint="نص: الأدوية تُصرف بناءً على التشخيص الطبي"
              />
              <Toggle
                checked={footerCfg.showCopyright}
                onChange={(v) => setFooterCfg({ ...footerCfg, showCopyright: v })}
                label="سطر الحقوق أسفل التذييل"
                hint="اسم الموقع والسنة وحقوق النشر"
              />
            </div>
          </SettingsSection>

          {/* النصوص */}
          <SettingsSection title="نصوص التذييل" icon={<FileText className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="نص حقوق النشر (الأسفل)">
                <input value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} className={inputClass} />
              </Field>
              <Field label="نص حقوق النشر (English)">
                <input value={form.footer_text_en || ''} onChange={(e) => setForm({ ...form, footer_text_en: e.target.value })} className={inputClass} dir="ltr" />
              </Field>
              <Field label="الجملة التعريفية تحت اسم الموقع">
                <input
                  value={footerCfg.footerTagline}
                  onChange={(e) => setFooterCfg({ ...footerCfg, footerTagline: e.target.value })}
                  className={inputClass}
                  placeholder="مثال: صيدليتك الأقرب أينما كنت"
                />
              </Field>
              <Field label="الجملة التعريفية (English)">
                <input
                  value={footerCfg.footerTagline_en || ''}
                  onChange={(e) => setFooterCfg({ ...footerCfg, footerTagline_en: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                  placeholder="Pharmacy tagline"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="عنوان صندوق النشرة">
                <input
                  value={footerCfg.newsletterTitle}
                  onChange={(e) => setFooterCfg({ ...footerCfg, newsletterTitle: e.target.value })}
                  className={inputClass}
                  disabled={!footerCfg.showNewsletter}
                />
              </Field>
              <Field label="عنوان صندوق النشرة (English)">
                <input
                  value={footerCfg.newsletterTitle_en || ''}
                  onChange={(e) => setFooterCfg({ ...footerCfg, newsletterTitle_en: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                  disabled={!footerCfg.showNewsletter}
                />
              </Field>
              <Field label="النص الفرعي للنشرة">
                <input
                  value={footerCfg.newsletterSubtitle}
                  onChange={(e) => setFooterCfg({ ...footerCfg, newsletterSubtitle: e.target.value })}
                  className={inputClass}
                  disabled={!footerCfg.showNewsletter}
                />
              </Field>
              <Field label="النص الفرعي للنشرة (English)">
                <input
                  value={footerCfg.newsletterSubtitle_en || ''}
                  onChange={(e) => setFooterCfg({ ...footerCfg, newsletterSubtitle_en: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                  disabled={!footerCfg.showNewsletter}
                />
              </Field>
              <Field label="نص زر الاشتراك">
                <input
                  value={footerCfg.newsletterButtonText}
                  onChange={(e) => setFooterCfg({ ...footerCfg, newsletterButtonText: e.target.value })}
                  className={inputClass}
                  disabled={!footerCfg.showNewsletter}
                />
              </Field>
              <Field label="نص زر الاشتراك (English)">
                <input
                  value={footerCfg.newsletterButtonText_en || ''}
                  onChange={(e) => setFooterCfg({ ...footerCfg, newsletterButtonText_en: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                  disabled={!footerCfg.showNewsletter}
                />
              </Field>
              <Field label="نص قسم التواصل الاجتماعي">
                <input
                  value={footerCfg.socialText}
                  onChange={(e) => setFooterCfg({ ...footerCfg, socialText: e.target.value })}
                  className={inputClass}
                  disabled={!footerCfg.showSocialSection}
                />
              </Field>
              <Field label="نص قسم التواصل الاجتماعي (English)">
                <input
                  value={footerCfg.socialText_en || ''}
                  onChange={(e) => setFooterCfg({ ...footerCfg, socialText_en: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                  disabled={!footerCfg.showSocialSection}
                />
              </Field>
              <Field label="عنوان الروابط السريعة">
                <input
                  value={footerCfg.quickLinksTitle}
                  onChange={(e) => setFooterCfg({ ...footerCfg, quickLinksTitle: e.target.value })}
                  className={inputClass}
                  disabled={!footerCfg.showQuickLinks}
                />
              </Field>
              <Field label="عنوان الروابط السريعة (English)">
                <input
                  value={footerCfg.quickLinksTitle_en || ''}
                  onChange={(e) => setFooterCfg({ ...footerCfg, quickLinksTitle_en: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                  disabled={!footerCfg.showQuickLinks}
                />
              </Field>
              <Field label="عنوان قسم التواصل والمساعدة">
                <input
                  value={footerCfg.contactTitle}
                  onChange={(e) => setFooterCfg({ ...footerCfg, contactTitle: e.target.value })}
                  className={inputClass}
                  disabled={!footerCfg.showContactSection}
                />
              </Field>
              <Field label="عنوان قسم التواصل والمساعدة (English)">
                <input
                  value={footerCfg.contactTitle_en || ''}
                  onChange={(e) => setFooterCfg({ ...footerCfg, contactTitle_en: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                  disabled={!footerCfg.showContactSection}
                />
              </Field>
              <Field label="عنوان قسم وسائل التواصل">
                <input
                  value={footerCfg.socialTitle}
                  onChange={(e) => setFooterCfg({ ...footerCfg, socialTitle: e.target.value })}
                  className={inputClass}
                  disabled={!footerCfg.showSocialSection}
                />
              </Field>
              <Field label="عنوان قسم وسائل التواصل (English)">
                <input
                  value={footerCfg.socialTitle_en || ''}
                  onChange={(e) => setFooterCfg({ ...footerCfg, socialTitle_en: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                  disabled={!footerCfg.showSocialSection}
                />
              </Field>
              <Field label="التنبيه الطبي السفلي">
                <input
                  value={footerCfg.bottomNoticeText}
                  onChange={(e) => setFooterCfg({ ...footerCfg, bottomNoticeText: e.target.value })}
                  className={inputClass}
                  disabled={!footerCfg.showBottomNotice}
                />
              </Field>
              <Field label="التنبيه الطبي السفلي (English)">
                <input
                  value={footerCfg.bottomNoticeText_en || ''}
                  onChange={(e) => setFooterCfg({ ...footerCfg, bottomNoticeText_en: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                  disabled={!footerCfg.showBottomNotice}
                />
              </Field>
            </div>
          </SettingsSection>

          {/* تخصيص صندوق النشرة */}
          <SettingsSection title="تخصيص صندوق النشرة" icon={<Sparkles className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              عدّل ألوان صندوق الاشتراك بالنشرة وأضف صورة خلفية له — ستظهر مباشرة في تذييل الموقع.
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 mb-5">
              <p className="text-xs font-bold text-gray-600 mb-3">معاينة حية</p>
              <div
                className="rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${footerCfg.newsletterBgStart}, ${footerCfg.newsletterBgEnd})` }}
              >
                {footerCfg.newsletterBgImage && (
                  <img src={footerCfg.newsletterBgImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
                )}
                <div className="relative flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center border backdrop-blur-sm" style={{ backgroundColor: withAlphaHex(footerCfg.newsletterTextColor, 0.15), borderColor: withAlphaHex(footerCfg.newsletterTextColor, 0.8) }}>
                    <Sparkles className="w-4 h-4" style={{ color: footerCfg.newsletterTextColor }} />
                  </div>
                  <div>
                    <p className="text-sm font-black" style={{ color: footerCfg.newsletterTextColor }}>{footerCfg.newsletterTitle}</p>
                    <p className="text-[10px] font-medium" style={{ color: withAlphaHex(footerCfg.newsletterTextColor, 0.8) }}>{footerCfg.newsletterSubtitle}</p>
                  </div>
                </div>
                <div className="relative flex items-center gap-2">
                  <span className="px-3 py-2 rounded-xl text-[10px] font-bold" style={{ backgroundColor: withAlphaHex(footerCfg.newsletterTextColor, 0.15), border: `1px solid ${withAlphaHex(footerCfg.newsletterTextColor, 0.8)}`, color: footerCfg.newsletterTextColor }}>
                    {footerCfg.newsletterInputPlaceholder}
                  </span>
                  <span className="px-3 py-2 rounded-xl text-[10px] font-extrabold shadow-md" style={{ backgroundColor: footerCfg.newsletterBtnBg, color: footerCfg.newsletterBtnText }}>
                    {footerCfg.newsletterButtonText}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorField label="لون بداية التدرج" value={footerCfg.newsletterBgStart} onChange={(v) => setFooterCfg({ ...footerCfg, newsletterBgStart: v })} />
              <ColorField label="لون نهاية التدرج" value={footerCfg.newsletterBgEnd} onChange={(v) => setFooterCfg({ ...footerCfg, newsletterBgEnd: v })} />
              <ColorField label="لون النصوص والأيقونات" value={footerCfg.newsletterTextColor} onChange={(v) => setFooterCfg({ ...footerCfg, newsletterTextColor: v })} />
              <ColorField label="لون زر الاشتراك" value={footerCfg.newsletterBtnBg} onChange={(v) => setFooterCfg({ ...footerCfg, newsletterBtnBg: v })} />
              <ColorField label="لون نص زر الاشتراك" value={footerCfg.newsletterBtnText} onChange={(v) => setFooterCfg({ ...footerCfg, newsletterBtnText: v })} />
            </div>

            <div className="mt-4">
              <ImageUploader
                label="صورة خلفية صندوق النشرة (اختياري)"
                value={footerCfg.newsletterBgImage}
                onChange={(v) => setFooterCfg({ ...footerCfg, newsletterBgImage: v })}
                hint="تظهر خلفية الصندوق بشكل خافت فوق التدرج اللوني — ارفع صورة بأبعاد واسعة مثل 1200x300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="نص حقل البريد (Placeholder)">
                <input value={footerCfg.newsletterInputPlaceholder} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterInputPlaceholder: e.target.value })} className={inputClass} disabled={!footerCfg.showNewsletter} />
              </Field>
              <Field label="نص حقل البريد (English)">
                <input value={footerCfg.newsletterInputPlaceholder_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterInputPlaceholder_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showNewsletter} />
              </Field>
              <Field label="رسالة نجاح الاشتراك">
                <input value={footerCfg.newsletterSuccessText} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterSuccessText: e.target.value })} className={inputClass} disabled={!footerCfg.showNewsletter} />
              </Field>
              <Field label="رسالة نجاح الاشتراك (English)">
                <input value={footerCfg.newsletterSuccessText_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterSuccessText_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showNewsletter} />
              </Field>
            </div>
          </SettingsSection>

          {/* شارات الثقة */}
          <SettingsSection title="نصوص شارات الثقة" icon={<ShieldCheck className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              الشارات الصغيرة أسفل اسم الموقع في التذييل — عدّل نصوصها لتوافق طبيعة متجرك.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="الشارة الأولى (الأيقونة: درع)">
                <input value={footerCfg.trustBadge1} onChange={(e) => setFooterCfg({ ...footerCfg, trustBadge1: e.target.value })} className={inputClass} disabled={!footerCfg.showTrustBadges} />
              </Field>
              <Field label="الشارة الأولى (English)">
                <input value={footerCfg.trustBadge1_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, trustBadge1_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showTrustBadges} />
              </Field>
              <Field label="الشارة الثانية (الأيقونة: توصيل)">
                <input value={footerCfg.trustBadge2} onChange={(e) => setFooterCfg({ ...footerCfg, trustBadge2: e.target.value })} className={inputClass} disabled={!footerCfg.showTrustBadges} />
              </Field>
              <Field label="الشارة الثانية (English)">
                <input value={footerCfg.trustBadge2_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, trustBadge2_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showTrustBadges} />
              </Field>
              <Field label="الشارة الثالثة (الأيقونة: ساعة)">
                <input value={footerCfg.trustBadge3} onChange={(e) => setFooterCfg({ ...footerCfg, trustBadge3: e.target.value })} className={inputClass} disabled={!footerCfg.showTrustBadges} />
              </Field>
              <Field label="الشارة الثالثة (English)">
                <input value={footerCfg.trustBadge3_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, trustBadge3_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showTrustBadges} />
              </Field>
            </div>
          </SettingsSection>
        </div>
      )}

      <div className="sticky bottom-4 z-20 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full sm:w-auto bg-white/95 backdrop-blur rounded-2xl shadow-xl shadow-slate-900/5 border border-gray-100 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5 whitespace-nowrap">
            <Info className="w-3.5 h-3.5 text-gray-400" />
            احفظ لتطبيق التغييرات على الموقع بالكامل
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: colors.primaryColor }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات والألوان'}
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-xl" style={{ backgroundColor: '#dc2626' }}>
          {toast}
        </div>
      )}
    </div>
  );
}


// ============================================
// Shared UI
// ============================================
const inputClass = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent focus:ring-2 text-sm text-gray-900";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>{children}</div>;
}

function FeatureToggle({
  icon, title, desc, checked, onChange, color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`text-right p-4 rounded-xl border-2 transition-all ${checked ? 'border-teal-500 bg-teal-50/50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${checked ? 'text-white' : 'text-gray-400 bg-gray-100'}`}
            style={checked ? { backgroundColor: color } : {}}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">{title}</p>
            <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{desc}</p>
          </div>
        </div>
        <span className={`relative inline-flex w-10 h-6 shrink-0 items-center rounded-full px-0.5 transition-colors ${checked ? 'bg-teal-500' : 'bg-gray-300'}`}>
          <span className={`inline-block w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'mr-4' : 'mr-0'}`} />
        </span>
      </div>
    </button>
  );
}

function Modal({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ImageUrlField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <ImageUploader label={label} value={value} onChange={onChange} />;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent text-sm text-gray-600 focus:outline-none" dir="ltr" />
      </div>
    </div>
  );
}

function withAlphaHex(hex: string, alpha: number): string {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

function SettingsSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50"><span className="text-gray-400">{icon}</span><h3 className="font-bold text-gray-900">{title}</h3></div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all text-right ${checked ? 'bg-teal-50/50 border-teal-200' : 'bg-gray-50/50 border-gray-200'}`}
    >
      <span className="min-w-0">
        <span className="block text-xs font-bold text-gray-800">{label}</span>
        {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
      </span>
      <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-teal-500' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-0.5' : 'left-[1.4rem]'}`} />
      </span>
    </button>
  );
}
