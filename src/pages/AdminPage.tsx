import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Store, Package, Tag, Settings, Plus, Edit2, Trash2,
  X, Search, MapPin, Phone, Star, Truck, Save, Eye, EyeOff,
  TrendingDown, List, ArrowLeft, Check, Image as ImageIcon, Cross,
  LogOut, Clock, Shield, Globe,
  Megaphone, Users, Activity, Palette,
  Menu, Heart, ShoppingCart, User, Mail, Facebook, Instagram, Twitter,
  ChevronDown, Monitor, Tablet, Smartphone, ShieldCheck, Sparkles, FileText,
  Send, Loader2, Wallet, Info, Zap, Mic, Barcode, Ticket, Percent, Copy, Inbox, CreditCard, Ban, Navigation, ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings, DEFAULT_THEME_COLORS, DEFAULT_HEADER_CONFIG, DEFAULT_FOOTER_CONFIG, DEFAULT_HERO_CONFIG, DEFAULT_PAYMENT_CONFIG, DEFAULT_STORE_CONFIG, type ThemeColors } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { translateError } from '@/lib/errorMessages';
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
import {
  PRESCRIPTION_STATUSES,
  PRESCRIPTION_STATUS_META,
  type Prescription,
  deletePrescription,
} from '@/lib/prescriptions';
import { insertNotification } from '@/lib/notifications';
import { notifyStockAvailable } from '@/lib/loyalty';
import type { Pharmacy, Product, Category, Discount, SiteSettings, FooterConfig, Coupon, NewsletterSubscriber, HeroConfig } from '@/types';

type AdminTab = 'dashboard' | 'orders' | 'prescriptions' | 'pharmacies' | 'products' | 'categories' | 'discounts' | 'coupons' | 'customers' | 'subscribers' | 'settings';

export function AdminPage() {
  const { settings } = useSettings();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [showPanel, setShowPanel] = useState(false);

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'orders', label: 'طلبات العملاء', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'prescriptions', label: 'الروشتات الواردة', icon: <FileText className="w-5 h-5" /> },
    { id: 'pharmacies', label: 'الصيدليات', icon: <Store className="w-5 h-5" /> },
    { id: 'products', label: 'المنتجات', icon: <Package className="w-5 h-5" /> },
    { id: 'categories', label: 'الفئات', icon: <List className="w-5 h-5" /> },
    { id: 'discounts', label: 'الخصومات', icon: <TrendingDown className="w-5 h-5" /> },
    { id: 'coupons', label: 'أكواد الخصم', icon: <Ticket className="w-5 h-5" /> },
    { id: 'customers', label: 'العملاء', icon: <Users className="w-5 h-5" /> },
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
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row" dir="rtl">
      {/* Sidebar */}
      <aside className={`lg:w-64 bg-gray-900 text-white lg:min-h-screen lg:fixed lg:right-0 lg:top-0 lg:bottom-0 ${showPanel ? 'block fixed inset-0 z-50' : 'hidden'} lg:block`}>
        <div className="p-5 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-8">
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

          <nav className="space-y-1 flex-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setShowPanel(false); }}
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
      <main className="flex-1 lg:mr-64">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
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
          {activeTab === 'customers' && <CustomersTab />}
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
                  <img
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
                        href={`https://wa.me/${rx.phone.replace(/\D/g, '')}`}
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
  product?: Product;
  pharmacy?: Pharmacy;
  customer?: { full_name: string | null; phone: string | null } | null;
}

function OrdersTab() {
  const { settings } = useSettings();
  const [list, setList] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | (typeof ORDER_STATUSES)[number]>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, product:products(*), pharmacy:pharmacies(*), customer:customers(full_name, phone)')
      .order('created_at', { ascending: false })
      .limit(200);
    setList((data || []) as OrderRecord[]);
    if (error) showToast(translateError(error.message).ar);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const counts = useCallback(
    (status: string) => list.filter((o) => o.status === status).length,
    [list]
  );

  const updateStatus = async (order: OrderRecord, status: string) => {
    setUpdatingId(order.id);
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', order.id);
    setUpdatingId(null);
    if (error) {
      showToast(translateError(error.message).ar);
    } else {
      await fetchOrders();
      showToast('تم تحديث حالة الطلب بنجاح');
      if (order.customer_id) {
        const meta = ORDER_STATUS_META[(status as (typeof ORDER_STATUSES)[number])] || ORDER_STATUS_META.pending;
        await insertNotification({
          customerId: order.customer_id,
          type: 'order',
          title: `تحديث حالة طلبك: ${meta.label}`,
          body: order.product?.name
            ? `طلبك "${order.product.name}" أصبح ${meta.label}`
            : `حالة طلبك أصبحت: ${meta.label}`,
        });
      }
    }
  };

  const filtered = filter === 'all' ? list : list.filter((o) => o.status === filter);

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
          <p className="text-2xl font-black text-gray-900">{list.length}</p>
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
          الكل ({list.length})
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
          {filtered.map((order) => {
            const m = ORDER_STATUS_META[(order.status as (typeof ORDER_STATUSES)[number])] || ORDER_STATUS_META.pending;
            const paymentLabel =
              order.payment_method === 'instapay'
                ? 'انستا باي'
                : order.payment_method === 'vodafone_cash'
                  ? 'فودافون كاش'
                  : null;
            const product = order.product;
            return (
              <div key={order.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold border ${m.className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                      {m.label}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-400" dir="ltr">#{order.id.slice(0, 8)}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Product + pharmacy */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 shrink-0 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                      {product?.image_url ? (
                        <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-7 h-7 text-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-gray-900 text-sm truncate">{product?.name || 'منتج'}</p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{order.pharmacy?.name || 'صيدلية'}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        الكمية: <strong className="text-gray-700">{order.quantity}</strong> ×{' '}
                        <strong className="text-gray-700">{Number(order.total_price / order.quantity).toFixed(2)}</strong> ج.م
                      </p>
                    </div>
                  </div>

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
                          {order.payment_screenshot_url && (
                            <a
                              href={order.payment_screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="عرض إثبات التحويل"
                              className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-1 rounded-lg text-white hover:brightness-110 transition-all"
                              style={{ backgroundColor: settings.primary_color }}
                            >
                              <ImageIcon className="w-3 h-3" />
                              إثبات التحويل
                            </a>
                          )}
                        </div>
                        {order.payment_number && (
                          <p className="text-[11px] font-black text-gray-800 mt-1" dir="ltr">
                            {order.payment_number}
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
                      <span className="truncate">{order.address || 'عنوان التوصيل غير محدد'}</span>
                    </p>
                    {order.note && (
                      <p className="text-[11px] font-bold text-gray-600 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                        <span className="truncate">{order.note}</span>
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-400 font-bold">الإجمالي</span>
                      <span className="font-black text-base" style={{ color: settings.primary_color }}>
                        {Number(order.total_price).toFixed(2)} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[10px] font-black text-gray-400 ml-1">تحديث الحالة:</span>
                  {ORDER_STATUSES.map((s) => {
                    const sm = ORDER_STATUS_META[s];
                    const active = order.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(order, s)}
                        disabled={updatingId === order.id}
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
                      href={`https://wa.me/${order.customer.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mr-auto flex items-center gap-1.5 py-2 px-4 rounded-xl bg-teal-500 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      واتساب العميل
                    </a>
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
// Dashboard Tab
// ============================================
function DashboardTab() {
  const { settings, storeConfig, refresh } = useSettings();
  const [togglingPurchases, setTogglingPurchases] = useState(false);
  const [stats, setStats] = useState({ pharmacies: 0, products: 0, categories: 0, discounts: 0, coupons: 0, customers: 0, orders: 0, revenue: 0 });
  const [recentPharmacies, setRecentPharmacies] = useState<Pharmacy[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; count: number; revenue: number }[]>([]);
  const [weekChart, setWeekChart] = useState<{ day: string; count: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [p, pr, c, d, cp, cu, orders] = await Promise.all([
        supabase.from('pharmacies').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('discounts').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('coupons').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('product_id, total_price, status, created_at, product:products(name)').order('created_at', { ascending: false }).limit(500),
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

  const cards = [
    { label: 'إجمالي المبيعات', value: `${stats.revenue.toFixed(0)} ج.م`, icon: <Wallet />, color: settings.primary_color },
    { label: 'الطلبات', value: stats.orders, icon: <ShoppingCart />, color: settings.secondary_color },
    { label: 'الصيدليات', value: stats.pharmacies, icon: <Store />, color: settings.primary_color },
    { label: 'المنتجات', value: stats.products, icon: <Package />, color: settings.secondary_color },
    { label: 'الفئات', value: stats.categories, icon: <List />, color: settings.accent_color },
    { label: 'الخصومات النشطة', value: stats.discounts, icon: <TrendingDown />, color: '#ef4444' },
    { label: 'أكواد الخصم', value: stats.coupons, icon: <Ticket />, color: '#8b5cf6' },
    { label: 'العملاء', value: stats.customers, icon: <Users />, color: '#0ea5e9' },
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
  const [toast, setToast] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchPharmacies = useCallback(async () => {
    setLoading(true);
    const [pharmRes, sectionsRes] = await Promise.all([
      supabase.from('pharmacies').select('*').order('created_at', { ascending: false }),
      supabase.from('pharmacy_sections').select('pharmacy_id, section_key'),
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
    </div>
  );
}

function PharmacyForm({ pharmacy, onClose, onSaved }: { pharmacy: Pharmacy | null; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({
    name: pharmacy?.name || '', description: pharmacy?.description || '',
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
          <Field label="المنطقة"><input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputClass} placeholder="مثال: المعادي" /></Field>
        </div>
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
function ProductsTab() {
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
    const { data } = await supabase.from('products').select('*, pharmacy:pharmacies(*), category:categories(*), discounts(*)').order('name');
    setProducts((data || []) as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
    supabase.from('pharmacies').select('*').order('name').then(({ data }) => setPharmacies((data || []) as Pharmacy[]));
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories((data || []) as Category[]));
  }, [fetchProducts]);

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
          <select value={filterPharmacy} onChange={(e) => setFilterPharmacy(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm" style={{ ['--tw-ring-color' as string]: settings.primary_color }}>
            <option value="">كل الصيدليات</option>
            {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
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
                <th className="text-right p-3 font-medium hidden sm:table-cell">الصيدلية</th>
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
                            {product.requires_prescription && <span className="text-xs text-amber-600">يحتاج وصفة</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 hidden sm:table-cell">{product.pharmacy?.name}</td>
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

      {showForm && <ProductForm product={editing} pharmacies={pharmacies} categories={categories} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { fetchProducts(); setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function ProductForm({ product, pharmacies, categories, onClose, onSaved }: { product: Product | null; pharmacies: Pharmacy[]; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({
    name: product?.name || '', name_en: product?.name_en || '', description: product?.description || '',
    price: product?.price?.toString() || '', unit: product?.unit || 'قطعة', image_url: product?.image_url || '',
    pharmacy_id: product?.pharmacy_id || pharmacies[0]?.id || '', category_id: product?.category_id || '',
    for_all_pharmacies: product?.for_all_pharmacies ?? false,
    is_available: product?.is_available ?? true, requires_prescription: product?.requires_prescription ?? false,
    active_ingredient: product?.active_ingredient || '', manufacturer: product?.manufacturer || '',
    form_type: product?.form || '', dosage: product?.dosage || '',
    stock_quantity: product?.stock_quantity?.toString() || '0', barcode: product?.barcode || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ownerPharmacyId = form.for_all_pharmacies && !form.pharmacy_id ? pharmacies[0]?.id || '' : form.pharmacy_id;
    const payload = {
      name: form.name, name_en: form.name_en, description: form.description,
      price: parseFloat(form.price) || 0, unit: form.unit, image_url: form.image_url,
      pharmacy_id: ownerPharmacyId, category_id: form.category_id || null,
      for_all_pharmacies: form.for_all_pharmacies,
      is_available: form.is_available, requires_prescription: form.requires_prescription,
      active_ingredient: form.active_ingredient || null, manufacturer: form.manufacturer || null,
      form: form.form_type || null, dosage: form.dosage || null,
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
        <ImageUrlField label="رابط صورة المنتج" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
        <div className="flex gap-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">متوفر</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.requires_prescription} onChange={(e) => setForm({ ...form, requires_prescription: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">يحتاج وصفة طبية</span></label>
        </div>
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
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories((data || []) as Category[]);
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
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-100 p-4 text-center group">
              <div className="flex justify-end gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditing(cat); setShowForm(true); }} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center"><Edit2 className="w-3.5 h-3.5 text-gray-600" /></button>
                <button onClick={() => handleDelete(cat.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: `${settings.primary_color}15` }}><List className="w-6 h-6" style={{ color: settings.primary_color }} /></div>
              <p className="text-sm font-medium text-gray-900">{cat.name}</p>
              {cat.name_en && <p className="text-xs text-gray-400 mt-0.5">{cat.name_en}</p>}
            </div>
          ))}
        </div>
      )}
      {showForm && <CategoryForm category={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { fetchCategories(); setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function CategoryForm({ category, onClose, onSaved }: { category: Category | null; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({ name: category?.name || '', name_en: category?.name_en || '', slug: category?.slug || '', icon: category?.icon || '' });
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    const slug = form.slug || form.name_en?.toLowerCase().replace(/\s+/g, '-') || form.name.trim().replace(/\s+/g, '-');
    const payload = { ...form, slug };
    if (category) { await supabase.from('categories').update(payload).eq('id', category.id); } else { await supabase.from('categories').insert(payload); }
    setSaving(false); onSaved();
  };
  return (
    <Modal onClose={onClose} title={category ? 'تعديل فئة' : 'إضافة فئة جديدة'}>
      <div className="space-y-4">
        <Field label="الاسم بالعربية *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
        <Field label="الاسم بالإنجليزية"><input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className={inputClass} dir="ltr" /></Field>
        <Field label="المعرف (slug)"><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputClass} dir="ltr" placeholder="auto-generated if empty" /></Field>
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
// Settings Tab
// ============================================
function SettingsTab() {
  const { settings, refresh } = useSettings();
  const [form, setForm] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mockSearch, setMockSearch] = useState('');

  const settingsNav = [
    { id: 'identity', label: 'الهوية والواجهة', icon: <Cross className="w-4 h-4" /> },
    { id: 'header', label: 'الهيدر', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'hero', label: 'القسم الرئيسي (Hero)', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'colors', label: 'الألوان والقوالب', icon: <Palette className="w-4 h-4" /> },
    { id: 'payment', label: 'الدفع والشحن', icon: <Wallet className="w-4 h-4" /> },
    { id: 'content', label: 'المحتوى والأقسام', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'contact', label: 'التواصل', icon: <Phone className="w-4 h-4" /> },
    { id: 'footer', label: 'التذييل (Footer)', icon: <Globe className="w-4 h-4" /> },
    { id: 'preview', label: 'معاينة الموقع', icon: <Eye className="w-4 h-4" /> },
  ] as const;
  type SettingsTabKey = (typeof settingsNav)[number]['id'];
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsTabKey>('identity');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

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
          return { ...DEFAULT_HERO_CONFIG, ...parsed.heroConfig };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return { ...DEFAULT_HERO_CONFIG };
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

  const handleSave = async () => {
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
      storeConfig: existingStoreConfig,
    });

    await supabase.from('site_settings').update({
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
    }).eq('id', form.id);

    setSaving(false);
    setSaved(true);
    refresh();
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetColors = () => {
    if (window.confirm('هل أنت متأكد من إعادة تعيين كافة الألوان إلى الألوان الافتراضية؟')) {
      setColors({ ...DEFAULT_THEME_COLORS });
      setForm(prev => ({
        ...prev,
        primary_color: DEFAULT_THEME_COLORS.primaryColor,
        secondary_color: DEFAULT_THEME_COLORS.secondaryColor,
        accent_color: DEFAULT_THEME_COLORS.accentColor
      }));
    }
  };

  interface ColorPreset {
    name: string;
    emoji: string;
    tagline: string;
    colors: ThemeColors;
  }

  const buildPreset = (
    name: string,
    emoji: string,
    tagline: string,
    primary: string,
    secondary: string,
    accent: string,
    heroTint: string
  ): ColorPreset => ({
    name,
    emoji,
    tagline,
    colors: {
      headerBg: '#ffffff',
      headerText: '#0f172a',
      headerNavBg: secondary,
      headerNavText: '#ffffff',
      heroBgStart: heroTint,
      heroBgMiddle: heroTint,
      heroBgEnd: '#f8fafc',
      heroText: '#0f172a',
      heroBtnBg: primary,
      heroBtnText: '#ffffff',
      primaryColor: primary,
      secondaryColor: secondary,
      accentColor: accent,
      statsCardBg: '#ffffff',
      statsCardText: '#0f172a',
      pharmacyHoverBorder: primary,
      footerBg: '#0f172a',
      footerText: '#cbd5e1',
    },
  });

  const buildDarkPreset = (
    name: string,
    emoji: string,
    tagline: string,
    primary: string,
    secondary: string,
    accent: string,
    deepBg: string,
    surfaceBg: string,
    heroStart: string,
    heroEnd: string,
    lightText: string
  ): ColorPreset => ({
    name,
    emoji,
    tagline,
    colors: {
      headerBg: surfaceBg,
      headerText: lightText,
      headerNavBg: deepBg,
      headerNavText: '#ffffff',
      heroBgStart: heroStart,
      heroBgMiddle: heroStart,
      heroBgEnd: heroEnd,
      heroText: lightText,
      heroBtnBg: primary,
      heroBtnText: '#ffffff',
      primaryColor: primary,
      secondaryColor: secondary,
      accentColor: accent,
      statsCardBg: surfaceBg,
      statsCardText: lightText,
      pharmacyHoverBorder: primary,
      footerBg: deepBg,
      footerText: '#94a3b8',
    },
  });

  const buildMonoPreset = (
    name: string,
    emoji: string,
    tagline: string,
    c: {
      headerBg: string; headerText: string;
      headerNavBg: string; headerNavText: string;
      heroBgStart: string; heroBgMiddle: string; heroBgEnd: string;
      heroText: string;
      heroBtnBg: string; heroBtnText: string;
      primaryColor: string; secondaryColor: string; accentColor: string;
      statsCardBg: string; statsCardText: string;
      pharmacyHoverBorder: string;
      footerBg: string; footerText: string;
    }
  ): ColorPreset => ({ name, emoji, tagline, colors: c });

  const colorPresets: ColorPreset[] = [
    buildPreset('أخضر طبي', '🌿', 'هوية طبية هادئة ومتوازنة', '#0d9488', '#0f766e', '#f59e0b', '#f0fdfa'),
    buildPreset('أزرق ثقة', '🩺', 'موثوقية ونقاء', '#2563eb', '#1e40af', '#f59e0b', '#eff6ff'),
    buildPreset('نيلي عصري', '🔷', 'احترافية حديثة', '#4f46e5', '#3730a3', '#f59e0b', '#eef2ff'),
    buildPreset('بنفسجي ملكي', '🔮', 'فخامة وتميز', '#7c3aed', '#5b21b6', '#f0abfc', '#f5f3ff'),
    buildPreset('وردي ناعم', '🌸', 'أناقة ولطافة', '#e11d48', '#be123c', '#fbbf24', '#fff1f2'),
    buildPreset('أحمر صيدلي', '❤️', 'حيوية ووضوح', '#dc2626', '#991b1b', '#fbbf24', '#fef2f2'),
    buildPreset('برتقالي شمسي', '🍊', 'دفء وطاقة', '#ea580c', '#9a3412', '#0d9488', '#fff7ed'),
    buildPreset('ذهبي دافئ', '✨', 'عصري وفاخر', '#d97706', '#92400e', '#0d9488', '#fffbeb'),
    buildPreset('تركواز ساحلي', '🌊', 'انتعاش وهدوء', '#0891b2', '#155e75', '#f97316', '#ecfeff'),
    buildPreset('زمردي غابة', '💎', 'طبيعي وموثوق', '#059669', '#065f46', '#fbbf24', '#ecfdf5'),
    buildDarkPreset('كحلي ليلي', '🌌', 'داكن فاخر بأزرق ليلي', '#3b82f6', '#2563eb', '#f59e0b', '#020617', '#0f172a', '#0b1220', '#111827', '#f1f5f9'),
    buildDarkPreset('فيروزي ليلي', '🌑', 'عمق تركوازي هادئ', '#2dd4bf', '#0d9488', '#fbbf24', '#042f2e', '#0a3d3a', '#042f2e', '#0f423f', '#f0fdfa'),
    buildDarkPreset('بنفسجي ليلي', '🔮', 'فخامة ملكية داكنة', '#a78bfa', '#7c3aed', '#f0abfc', '#140b2e', '#1e1145', '#140b2e', '#241257', '#ede9fe'),
    buildDarkPreset('كهرماني داكن', '🪔', 'دفء شرقي أصيل', '#f59e0b', '#b45309', '#fbbf24', '#1c1305', '#29200f', '#1c1305', '#2d2412', '#fef3c7'),
    buildDarkPreset('أوبسيديان وذهبي', '👑', 'أناقة مطلقة بالسواد والذهب', '#eab308', '#a16207', '#fde68a', '#0a0a0a', '#171717', '#0a0a0a', '#1c1c1c', '#fefce8'),
    buildDarkPreset('قرمزي ليلي', '🥀', 'شغف وجاذبية داكنة', '#f43f5e', '#be123c', '#fb923c', '#1f0a12', '#2d0f1a', '#1f0a12', '#351020', '#ffe4e6'),
    buildDarkPreset('غابة داكنة', '🪵', 'طبيعة عميقة ومريحة', '#22c55e', '#15803d', '#fbbf24', '#0a1408', '#13220f', '#0a1408', '#173117', '#dcfce7'),
    buildDarkPreset('فحمي أنيق', '🖤', 'رقي أحادي اللون', '#94a3b8', '#475569', '#38bdf8', '#0b0f14', '#161c24', '#0b0f14', '#1a212b', '#f1f5f9'),
    buildDarkPreset('نيلي فحمي', '🔷', 'عمق نيلي احترافي', '#6366f1', '#4338ca', '#22d3ee', '#0e0f1f', '#191b34', '#0e0f1f', '#20224a', '#e0e7ff'),
    buildDarkPreset('توتي ليلي', '🍇', 'جرأة وسحر داكن', '#e879f9', '#a21caf', '#fbbf24', '#23071f', '#330b2d', '#23071f', '#3d0f35', '#fae8ff'),
  ];

  // ===== قوالب الأبيض والأسود — primaryColor دائماً داكن لضمان ظهور النصوص =====
  const monoPresets: ColorPreset[] = [
    buildMonoPreset('ورقي نقي', '📄', 'بياض دافئ مع لمسات فحمية', {
      headerBg: '#ffffff', headerText: '#1a1a1a',
      headerNavBg: '#f5f5f0', headerNavText: '#1a1a1a',
      heroBgStart: '#fefcfa', heroBgMiddle: '#f8f3ec', heroBgEnd: '#ede5d8',
      heroText: '#1a1a1a',
      heroBtnBg: '#1a1a1a', heroBtnText: '#ffffff',
      primaryColor: '#2a2a2a', secondaryColor: '#5a5a5a', accentColor: '#8a8580',
      statsCardBg: '#ffffff', statsCardText: '#1a1a1a',
      pharmacyHoverBorder: '#1a1a1a',
      footerBg: '#1a1a1a', footerText: '#d0cbc6',
    }),
    buildMonoPreset('فضي أنيق', '🪙', 'بريق فضي بدرجات باردة', {
      headerBg: '#f5f5f7', headerText: '#1c1c1e',
      headerNavBg: '#d2d2d7', headerNavText: '#1c1c1e',
      heroBgStart: '#e8e8ec', heroBgMiddle: '#d0d0d8', heroBgEnd: '#b8b8c4',
      heroText: '#1c1c1e',
      heroBtnBg: '#1c1c1e', heroBtnText: '#ffffff',
      primaryColor: '#3a3a3c', secondaryColor: '#636366', accentColor: '#8e8e92',
      statsCardBg: '#ffffff', statsCardText: '#1c1c1e',
      pharmacyHoverBorder: '#1c1c1e',
      footerBg: '#1c1c1e', footerText: '#b8b8bc',
    }),
    buildMonoPreset('رمادي ملكي', '🏛️', 'رقي رمادي بتباين قوي', {
      headerBg: '#48484a', headerText: '#f5f5f7',
      headerNavBg: '#3a3a3c', headerNavText: '#f5f5f7',
      heroBgStart: '#58585a', heroBgMiddle: '#48484a', heroBgEnd: '#383838',
      heroText: '#f5f5f7',
      heroBtnBg: '#f5f5f7', heroBtnText: '#1c1c1e',
      primaryColor: '#3a3a3c', secondaryColor: '#8e8e93', accentColor: '#c0c0c5',
      statsCardBg: '#58585a', statsCardText: '#f5f5f7',
      pharmacyHoverBorder: '#f5f5f7',
      footerBg: '#2c2c2e', footerText: '#b0b0b5',
    }),
    buildMonoPreset('كحلي فحمي', '🌑', 'كحلي عميق بلمسة زرقاء', {
      headerBg: '#1a1f2e', headerText: '#e8eaf0',
      headerNavBg: '#111520', headerNavText: '#e8eaf0',
      heroBgStart: '#2a3040', heroBgMiddle: '#1a2030', heroBgEnd: '#0e1220',
      heroText: '#e8eaf0',
      heroBtnBg: '#e8eaf0', heroBtnText: '#0e1220',
      primaryColor: '#2a3040', secondaryColor: '#606878', accentColor: '#8890a0',
      statsCardBg: '#242a38', statsCardText: '#e8eaf0',
      pharmacyHoverBorder: '#e8eaf0',
      footerBg: '#0a0d14', footerText: '#8890a0',
    }),
    buildMonoPreset('فحمي فاخر', '🖤', 'أسود فاخر بلمعات فضية', {
      headerBg: '#141414', headerText: '#f0f0f0',
      headerNavBg: '#0a0a0a', headerNavText: '#f0f0f0',
      heroBgStart: '#1e1e1e', heroBgMiddle: '#141414', heroBgEnd: '#0a0a0a',
      heroText: '#f0f0f0',
      heroBtnBg: '#f0f0f0', heroBtnText: '#0a0a0a',
      primaryColor: '#1e1e1e', secondaryColor: '#707070', accentColor: '#a0a0a0',
      statsCardBg: '#1e1e1e', statsCardText: '#f0f0f0',
      pharmacyHoverBorder: '#f0f0f0',
      footerBg: '#050505', footerText: '#909090',
    }),
    buildMonoPreset('سحاب رمادي', '☁️', 'غيوم ناعمة بدرجات هادئة', {
      headerBg: '#eef0f2', headerText: '#2c2e32',
      headerNavBg: '#c8ccd2', headerNavText: '#2c2e32',
      heroBgStart: '#dde0e5', heroBgMiddle: '#c8cdd5', heroBgEnd: '#b0b8c4',
      heroText: '#1a1c20',
      heroBtnBg: '#2c2e32', heroBtnText: '#ffffff',
      primaryColor: '#2c2e32', secondaryColor: '#586068', accentColor: '#8890a0',
      statsCardBg: '#ffffff', statsCardText: '#2c2e32',
      pharmacyHoverBorder: '#2c2e32',
      footerBg: '#1c1e22', footerText: '#909aa4',
    }),
    buildMonoPreset('حديد صلب', '⚙️', 'صلب مقسّى بتدرجات معدنية', {
      headerBg: '#b8bcc4', headerText: '#1a1c20',
      headerNavBg: '#888c94', headerNavText: '#ffffff',
      heroBgStart: '#c8ccd4', heroBgMiddle: '#a0a4ac', heroBgEnd: '#787c84',
      heroText: '#1a1c20',
      heroBtnBg: '#1a1c20', heroBtnText: '#ffffff',
      primaryColor: '#2c3038', secondaryColor: '#585c64', accentColor: '#a0a4ac',
      statsCardBg: '#ffffff', statsCardText: '#1a1c20',
      pharmacyHoverBorder: '#1a1c20',
      footerBg: '#1a1c20', footerText: '#b8bcc4',
    }),
    buildMonoPreset('بلاتيني', '💎', 'بلاتين نقي بلمعان راقي', {
      headerBg: '#fafafa', headerText: '#1a1a1a',
      headerNavBg: '#e8e8e8', headerNavText: '#1a1a1a',
      heroBgStart: '#f5f5f5', heroBgMiddle: '#ececec', heroBgEnd: '#e0e0e0',
      heroText: '#1a1a1a',
      heroBtnBg: '#1a1a1a', heroBtnText: '#ffffff',
      primaryColor: '#333333', secondaryColor: '#666666', accentColor: '#aaaaaa',
      statsCardBg: '#ffffff', statsCardText: '#1a1a1a',
      pharmacyHoverBorder: '#1a1a1a',
      footerBg: '#222222', footerText: '#aaaaaa',
    }),
    buildMonoPreset('سوداء مطلقة', '🖤', 'أسود كامل بتفاصيل واضحة', {
      headerBg: '#000000', headerText: '#ffffff',
      headerNavBg: '#0a0a0a', headerNavText: '#ffffff',
      heroBgStart: '#0a0a0a', heroBgMiddle: '#050505', heroBgEnd: '#000000',
      heroText: '#ffffff',
      heroBtnBg: '#ffffff', heroBtnText: '#000000',
      primaryColor: '#333333', secondaryColor: '#aaaaaa', accentColor: '#888888',
      statsCardBg: '#111111', statsCardText: '#ffffff',
      pharmacyHoverBorder: '#ffffff',
      footerBg: '#000000', footerText: '#888888',
    }),
    buildMonoPreset('رمادي زجاجي', '🧊', 'زجاج مصنفر بلمعان أنيق', {
      headerBg: '#d4d4d8', headerText: '#18181b',
      headerNavBg: '#a1a1aa', headerNavText: '#ffffff',
      heroBgStart: '#e4e4e7', heroBgMiddle: '#d4d4d8', heroBgEnd: '#a1a1aa',
      heroText: '#18181b',
      heroBtnBg: '#18181b', heroBtnText: '#ffffff',
      primaryColor: '#27272a', secondaryColor: '#52525b', accentColor: '#8a8a90',
      statsCardBg: '#f4f4f5', statsCardText: '#18181b',
      pharmacyHoverBorder: '#18181b',
      footerBg: '#18181b', footerText: '#a1a1aa',
    }),
  ];

  return (
    <div className="space-y-6">
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">تم حفظ الإعدادات والألوان بنجاح</span>
        </div>
      )}

      {/* Sub navigation */}
      <div className="sticky top-2 z-30 bg-white/95 backdrop-blur rounded-2xl border border-gray-100 p-1.5 shadow-sm flex items-center gap-1.5 overflow-x-auto">
        {settingsNav.map((item) => (
          <button
            key={item.id}
            onClick={() => setSettingsSubTab(item.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              settingsSubTab === item.id
                ? 'bg-gray-900 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className={settingsSubTab === item.id ? 'text-teal-300' : 'text-gray-400'}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {settingsSubTab === 'identity' && (
        <div className="space-y-6">
          <SettingsSection title="هوية الموقع الأساسية" icon={<Cross className="w-5 h-5" />}>
            <Field label="اسم الموقع"><input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} className={inputClass} /></Field>
            <Field label="الشعار النصي (Tagline)"><input value={form.site_tagline} onChange={(e) => setForm({ ...form, site_tagline: e.target.value })} className={inputClass} /></Field>
            <Field label="وصف الموقع"><textarea value={form.site_description || ''} onChange={(e) => setForm({ ...form, site_description: e.target.value })} className={inputClass} rows={2} /></Field>
            <ImageUrlField label="شعار الموقع (Logo)" value={form.logo_url || ''} onChange={(v) => setForm({ ...form, logo_url: v })} />
          </SettingsSection>

<SettingsSection title="القسم الرئيسي (Hero)" icon={<LayoutDashboard className="w-5 h-5" />}>
            <Field label="العنوان الرئيسي"><input value={form.hero_title} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} className={inputClass} /></Field>
            <Field label="النص الفرعي"><textarea value={form.hero_subtitle} onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })} className={inputClass} rows={2} /></Field>
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
              <Toggle checked={heroCfg.showStats} onChange={(v) => setHeroCfg({ ...heroCfg, showStats: v })} label="أرقام الإحصائيات" hint="البطاقات الأربعة (صيدلية شريكة، منتج متاح...) أسفل الهيرو" />
              <Toggle checked={heroCfg.showPrescriptionButton} onChange={(v) => setHeroCfg({ ...heroCfg, showPrescriptionButton: v })} label="زر رفع الروشتة" hint="زر رفع الروشتة الطبية" />
              <Toggle checked={heroCfg.showLocationButton} onChange={(v) => setHeroCfg({ ...heroCfg, showLocationButton: v })} label="زر تحديد الموقع" hint="زر تحديد الموقع لإيجاد أقرب الصيدليات" />
            </div>
          </SettingsSection>

          <SettingsSection title="نصوص الهيرو" icon={<FileText className="w-5 h-5" />}>
            <div className="space-y-4">
              <Field label="نص البحث الافتراضي (Placeholder)">
                <input value={heroCfg.searchPlaceholder} onChange={(e) => setHeroCfg({ ...heroCfg, searchPlaceholder: e.target.value })} className={inputClass} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="نص زر رفع الروشتة">
                  <input value={heroCfg.prescriptionButtonText} onChange={(e) => setHeroCfg({ ...heroCfg, prescriptionButtonText: e.target.value })} className={inputClass} />
                </Field>
                <Field label="نص زر تحديد الموقع">
                  <input value={heroCfg.locationButtonText} onChange={(e) => setHeroCfg({ ...heroCfg, locationButtonText: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <Field label="نص بعد تحديد الموقع">
                <input value={heroCfg.locationSetText} onChange={(e) => setHeroCfg({ ...heroCfg, locationSetText: e.target.value })} className={inputClass} />
              </Field>
              <Field label="عنوان قائمة الأكثر بحثاً">
                <input value={heroCfg.trendingLabel} onChange={(e) => setHeroCfg({ ...heroCfg, trendingLabel: e.target.value })} className={inputClass} />
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

          <SettingsSection title="أرقام الإحصائيات (البطاقات الأربعة)" icon={<Percent className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              عدّل القيمة والعنوان والوصف لكل بطاقة. الأيقونة تُختار من: store, package, users, truck, pills.
            </p>
            <div className="space-y-4">
              {heroCfg.stats.map((s, i) => (
                <div key={s.id} className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <input
                    value={s.value}
                    onChange={(e) => setHeroCfg({ ...heroCfg, stats: heroCfg.stats.map((x) => (x.id === s.id ? { ...x, value: e.target.value } : x)) })}
                    className={inputClass}
                    placeholder="القيمة"
                  />
                  <input
                    value={s.sub}
                    onChange={(e) => setHeroCfg({ ...heroCfg, stats: heroCfg.stats.map((x) => (x.id === s.id ? { ...x, sub: e.target.value } : x)) })}
                    className={inputClass}
                    placeholder="العنوان"
                  />
                  <input
                    value={s.desc}
                    onChange={(e) => setHeroCfg({ ...heroCfg, stats: heroCfg.stats.map((x) => (x.id === s.id ? { ...x, desc: e.target.value } : x)) })}
                    className={inputClass}
                    placeholder="الوصف"
                  />
                  <select
                    value={s.icon}
                    onChange={(e) => setHeroCfg({ ...heroCfg, stats: heroCfg.stats.map((x) => (x.id === s.id ? { ...x, icon: e.target.value } : x)) })}
                    className={inputClass}
                  >
                    <option value="store">صيدلية</option>
                    <option value="package">منتج</option>
                    <option value="users">عميل</option>
                    <option value="truck">توصيل</option>
                    <option value="pills">أدوية</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setHeroCfg({ ...heroCfg, stats: heroCfg.stats.filter((x) => x.id !== s.id) })}
                    className="flex items-center justify-center gap-1 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg border border-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setHeroCfg({ ...heroCfg, stats: [...heroCfg.stats, { id: `stat_${Date.now()}`, value: '0', sub: 'عنوان جديد', desc: 'وصف جديد', icon: 'store' }] })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-500 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" /> إضافة بطاقة جديدة
              </button>
            </div>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'colors' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* RIGHT PANEL: COLOR CONTROLS */}
          <div className="xl:col-span-2 space-y-6">
            {/* ADVANCED WEBSITE COLORS MANAGER */}
            <SettingsSection title="لوحة تخصيص ألوان الموقع بالكامل" icon={<Tag className="w-5 h-5" />}>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                قم باختيار الألوان المخصصة لكل جزء بالموقع وشاهد النتيجة فوراً في المعاينة الحية بالجانب قبل الحفظ.
              </p>

            <div className="space-y-4">
              <ColorGroup
                num="1"
                title="ألوان الهوية الأساسية"
                location="الشعار والأزرار"
                hint="ألوان الهوية المستخدمة في الشعار وأزرار الموقع والوسومات — تغييرها يظهر فوراً في كل الأزرار والتسميات."
                visual={<IdentityVisual colors={colors} />}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <ColorField label="اللون الأساسي (أزرار ونصوص)" value={colors.primaryColor} onChange={(v) => setColors({ ...colors, primaryColor: v })} />
                  <ColorField label="اللون الثانوي" value={colors.secondaryColor} onChange={(v) => setColors({ ...colors, secondaryColor: v })} />
                  <ColorField label="لون التمييز والوسومات" value={colors.accentColor} onChange={(v) => setColors({ ...colors, accentColor: v })} />
                </div>
              </ColorGroup>

              <ColorGroup
                num="2"
                title="الهيدر العلوي"
                location="أعلى الموقع"
                hint="الشريط العلوي ومساحة البحث وأيقونات الحساب والسلة — قم بتغيير الخلفية والنصوص وشاهد شكله هنا."
                visual={<HeaderVisual colors={colors} />}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ColorField label="خلفية الهيدر العلوي" value={colors.headerBg} onChange={(v) => setColors({ ...colors, headerBg: v })} />
                  <ColorField label="نصوص وأيقونات الهيدر" value={colors.headerText} onChange={(v) => setColors({ ...colors, headerText: v })} />
                </div>
              </ColorGroup>

              <ColorGroup
                num="3"
                title="شريط التصنيفات (الملاحة)"
                location="تحت الهيدر مباشرة"
                hint="شريط الأقسام والتصنيفات أسفل الهيدر — الألوان هنا تخص خلفية الشريط ونصوص الأقسام."
                visual={<NavVisual colors={colors} />}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ColorField label="خلفية شريط التصنيفات" value={colors.headerNavBg} onChange={(v) => setColors({ ...colors, headerNavBg: v })} />
                  <ColorField label="نص شريط التصنيفات" value={colors.headerNavText} onChange={(v) => setColors({ ...colors, headerNavText: v })} />
                </div>
              </ColorGroup>

              <ColorGroup
                num="4"
                title="البانر الرئيسي (Hero)"
                location="بداية الصفحة الرئيسية"
                hint="البانر الترحيبي مع بحث الأدوية والوسمات الرائجة — تتدرج الخلفية من البداية للمنتصف للنهاية."
                visual={<HeroVisual colors={colors} />}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <ColorField label="بداية تدرج البانر" value={colors.heroBgStart} onChange={(v) => setColors({ ...colors, heroBgStart: v })} />
                  <ColorField label="منتصف تدرج البانر" value={colors.heroBgMiddle} onChange={(v) => setColors({ ...colors, heroBgMiddle: v })} />
                  <ColorField label="نهاية تدرج البانر" value={colors.heroBgEnd} onChange={(v) => setColors({ ...colors, heroBgEnd: v })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  <ColorField label="لون نصوص البانر" value={colors.heroText} onChange={(v) => setColors({ ...colors, heroText: v })} />
                  <ColorField label="خلفية زر البحث" value={colors.heroBtnBg} onChange={(v) => setColors({ ...colors, heroBtnBg: v })} />
                  <ColorField label="نص زر البحث" value={colors.heroBtnText} onChange={(v) => setColors({ ...colors, heroBtnText: v })} />
                </div>
              </ColorGroup>

              <ColorGroup
                num="5"
                title="كروت الأرقام والإحصائيات"
                location="منتصف الصفحة الرئيسية"
                hint="البطاقات التي تعرض عدد الصيدليات والمنتجات وخدمات التوصيل — خلفية الكارت ونصوص الأرقام."
                visual={<StatsVisual colors={colors} />}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ColorField label="خلفية كروت الأرقام" value={colors.statsCardBg} onChange={(v) => setColors({ ...colors, statsCardBg: v })} />
                  <ColorField label="نصوص كروت الأرقام" value={colors.statsCardText} onChange={(v) => setColors({ ...colors, statsCardText: v })} />
                </div>
              </ColorGroup>

              <ColorGroup
                num="6"
                title="كارت الصيدلية"
                location="أقسام الصيدليات"
                hint="إطار بطاقة الصيدلية عند مرور المؤشر عليها (Hover) — استخدم لوناً واضحاً يظهر عند التحديد."
                visual={<PharmacyCardVisual colors={colors} />}
              >
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                  <ColorField label="إطار كارت الصيدلية (Hover)" value={colors.pharmacyHoverBorder} onChange={(v) => setColors({ ...colors, pharmacyHoverBorder: v })} />
                </div>
              </ColorGroup>

              <ColorGroup
                num="7"
                title="الفوتر (التذييل)"
                location="أسفل الموقع"
                hint="التذييل النهائي مع الروابط والنشرة البريدية وأيقونات التواصل — تغيير الخلفية والنصوص يظهر هنا."
                visual={<FooterVisual colors={colors} />}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ColorField label="خلفية الفوتر" value={colors.footerBg} onChange={(v) => setColors({ ...colors, footerBg: v })} />
                  <ColorField label="نصوص الفوتر" value={colors.footerText} onChange={(v) => setColors({ ...colors, footerText: v })} />
                </div>
              </ColorGroup>
            </div>

            <div className="pt-5 mt-5 border-t border-gray-100">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center">
                      <Palette className="w-4 h-4" />
                    </span>
                    قوالب تصميم احترافية جاهزة
                    <span className="px-2 py-0.5 rounded-full bg-gray-900 text-white text-[10px] font-bold">30</span>
                  </h4>
                  <p className="text-xs text-gray-500 mt-1.5">
                    اختر قالباً لتطبيق هوية لونية متكاملة واحترافية على الموقع بالكامل بضغطة واحدة.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetColors}
                  className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all"
                >
                  إعادة تعيين الألوان الافتراضية
                </button>
              </div>

              <div className="space-y-5">
                {[
                  { emoji: '☀️', label: 'قوالب فاتحة', list: colorPresets.slice(0, 10) },
                  { emoji: '🌙', label: 'قوالب داكنة', list: colorPresets.slice(10) },
                  { emoji: '⚫', label: 'قوالب أبيض وأسود', list: monoPresets },
                ].map((group) => (
                  <div key={group.label}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px]">{group.emoji}</span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{group.label}</span>
                      <span className="flex-1 h-px bg-gray-100" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                      {group.list.map((preset) => {
                        const isActive =
                          colors.primaryColor === preset.colors.primaryColor &&
                          colors.secondaryColor === preset.colors.secondaryColor &&
                          colors.accentColor === preset.colors.accentColor;

                        return (
                          <button
                            key={preset.name}
                            onClick={() => setColors(preset.colors)}
                            className={`group relative text-right rounded-2xl border-2 p-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                              isActive
                                ? 'border-gray-900 bg-gray-50 shadow-lg'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            {isActive && (
                              <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center z-10">
                                <Check className="w-3 h-3" strokeWidth={3} />
                              </span>
                            )}

                            {/* Mini live site preview */}
                            <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-white">
                              <div className="h-3 flex items-center gap-1 px-1.5" style={{ backgroundColor: preset.colors.headerNavBg }}>
                                <span className="w-6 h-1 rounded-full bg-white/70" />
                                <span className="w-3 h-1 rounded-full bg-white/40" />
                                <span className="mr-auto w-4 h-1 rounded-full bg-white/70" />
                              </div>

                              <div className="px-1.5 py-1 flex items-center gap-1" style={{ backgroundColor: preset.colors.headerBg, color: preset.colors.headerText }}>
                                <span className="w-2 h-2 rounded flex items-center justify-center text-white text-[3px] font-black leading-none" style={{ backgroundColor: preset.colors.primaryColor }}>
                                  +
                                </span>
                                <span className="text-[4px] font-black truncate">صيدليتي</span>
                                <span className="mr-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: preset.colors.accentColor }} />
                              </div>

                              <div
                                className="px-1.5 py-1.5 space-y-0.5"
                                style={{ background: `linear-gradient(135deg, ${preset.colors.heroBgStart}, ${preset.colors.heroBgEnd})`, color: preset.colors.heroText }}
                              >
                                <p className="text-[4px] font-black">اعثر على دوائك</p>
                                <p className="text-[3px] opacity-70">في أقرب صيدلية</p>
                                <div className="flex items-center gap-0.5 pt-0.5">
                                  <span className="text-[3px] font-bold" style={{ color: preset.colors.accentColor }}>
                                    الأكثر بحثاً:
                                  </span>
                                  <span className="px-0.5 py-px rounded-full bg-white text-[3px] font-bold" style={{ color: preset.colors.primaryColor }}>بنادول</span>
                                  <span className="px-0.5 py-px rounded-full bg-white text-[3px] font-bold" style={{ color: preset.colors.secondaryColor }}>أوجمنتين</span>
                                </div>
                                <div className="flex items-center bg-white rounded-full px-1 py-0.5 gap-0.5 mt-0.5">
                                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: preset.colors.primaryColor }} />
                                  <span className="flex-1 h-0.5 rounded-full bg-gray-200" />
                                  <span className="px-1 py-px rounded-full text-[3px] font-black" style={{ backgroundColor: preset.colors.heroBtnBg, color: preset.colors.heroBtnText }}>
                                    بحث
                                  </span>
                                </div>
                              </div>

                              <div className="h-3 flex items-center justify-between px-1.5" style={{ backgroundColor: preset.colors.footerBg }}>
                                <span className="w-6 h-1 rounded-full" style={{ backgroundColor: preset.colors.footerText }} />
                                <span className="w-2.5 h-1.5 rounded-full" style={{ backgroundColor: preset.colors.accentColor }} />
                              </div>
                            </div>

                            <div className="mt-2 px-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-gray-800">{preset.name}</span>
                                <div className="flex gap-1">
                                  <span className="w-2.5 h-2.5 rounded-full ring-1 ring-black/5" style={{ backgroundColor: preset.colors.primaryColor }} />
                                  <span className="w-2.5 h-2.5 rounded-full ring-1 ring-black/5" style={{ backgroundColor: preset.colors.secondaryColor }} />
                                  <span className="w-2.5 h-2.5 rounded-full ring-1 ring-black/5" style={{ backgroundColor: preset.colors.accentColor }} />
                                </div>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5 truncate">{preset.emoji} {preset.tagline}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </SettingsSection>
          </div>

          {/* LEFT PANEL: STICKY LIVE PREVIEW */}
          <div className="xl:col-span-1 xl:sticky xl:top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-teal-600" />
                  معاينة حية للألوان
                </h4>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-teal-600" />
                  مباشر
                </span>
              </div>
              <div className="p-3 bg-slate-100">
                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xl text-slate-900">
                  <SitePreviewMockup colors={colors} form={form} headerCfg={headerCfg} mockSearch={mockSearch} onSearchChange={setMockSearch} device="desktop" compact />
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
                  <Truck className="w-3 h-3 text-gray-400" />
                  يتحدّث فورياً أثناء تعديل الألوان واختيار القوالب
                </p>
              </div>
            </div>
          </div>
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
            <Field label="نص القسم"><textarea value={form.about_text || ''} onChange={(e) => setForm({ ...form, about_text: e.target.value })} className={inputClass} rows={3} /></Field>
          </SettingsSection>

          <SettingsSection title="الشريط الإعلاني" icon={<Megaphone className="w-5 h-5" />}>
            <label className="flex items-center gap-2 cursor-pointer mb-3"><input type="checkbox" checked={form.announcement_active} onChange={(e) => setForm({ ...form, announcement_active: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">تفعيل الشريط الإعلاني</span></label>
            <Field label="نص الإعلان"><input value={form.announcement_text || ''} onChange={(e) => setForm({ ...form, announcement_text: e.target.value })} className={inputClass} placeholder="نص الإعلان الذي يظهر أعلى الموقع" /></Field>
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
            </div>
          </SettingsSection>

          {/* النصوص */}
          <SettingsSection title="نصوص التذييل" icon={<FileText className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="نص حقوق النشر (الأسفل)">
                <input value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} className={inputClass} />
              </Field>
              <Field label="الجملة التعريفية تحت اسم الموقع">
                <input
                  value={footerCfg.footerTagline}
                  onChange={(e) => setFooterCfg({ ...footerCfg, footerTagline: e.target.value })}
                  className={inputClass}
                  placeholder="مثال: صيدليتك الأقرب أينما كنت"
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
              <Field label="النص الفرعي للنشرة">
                <input
                  value={footerCfg.newsletterSubtitle}
                  onChange={(e) => setFooterCfg({ ...footerCfg, newsletterSubtitle: e.target.value })}
                  className={inputClass}
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
              <Field label="نص قسم التواصل الاجتماعي">
                <input
                  value={footerCfg.socialText}
                  onChange={(e) => setFooterCfg({ ...footerCfg, socialText: e.target.value })}
                  className={inputClass}
                  disabled={!footerCfg.showSocialSection}
                />
              </Field>
            </div>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'preview' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-teal-400" />
                  معاينة الموقع بالحجم الحقيقي
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  شاهد شكل الموقع على مختلف الأجهزة — جرّب الألوان والنصوص ثم احفظ التغييرات.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
                {[
                  { id: 'mobile', label: 'هاتف', icon: <Smartphone className="w-3.5 h-3.5" /> },
                  { id: 'tablet', label: 'تابلت', icon: <Tablet className="w-3.5 h-3.5" /> },
                  { id: 'desktop', label: 'كمبيوتر', icon: <Monitor className="w-3.5 h-3.5" /> },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setPreviewDevice(d.id as 'desktop' | 'tablet' | 'mobile')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      previewDevice === d.id ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {d.icon}
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              {previewDevice === 'desktop' && (
                <div className="mx-auto max-w-3xl">
                  <div className="bg-slate-800 rounded-2xl rounded-b-none px-3 py-2 flex items-center gap-2 border-b border-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <span className="flex-1 mx-2 h-4 rounded-md bg-slate-700 text-[9px] text-slate-400 flex items-center justify-center font-mono" dir="ltr">
                      {form.site_name.toLowerCase()}.site
                    </span>
                  </div>
                  <div className="bg-slate-100 rounded-b-2xl overflow-hidden border border-slate-700 border-t-0 text-slate-900 shadow-2xl">
                    <SitePreviewMockup colors={colors} form={form} headerCfg={headerCfg} mockSearch={mockSearch} onSearchChange={setMockSearch} device="desktop" />
                  </div>
                </div>
              )}

              {previewDevice === 'tablet' && (
                <div className="mx-auto max-w-lg">
                  <div className="rounded-[1.75rem] bg-slate-800 p-2.5 shadow-2xl border border-slate-700">
                    <div className="relative bg-slate-100 rounded-[1.2rem] overflow-hidden text-slate-900">
                      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-slate-800/90 z-20" />
                      <SitePreviewMockup colors={colors} form={form} headerCfg={headerCfg} mockSearch={mockSearch} onSearchChange={setMockSearch} device="tablet" />
                    </div>
                  </div>
                </div>
              )}

              {previewDevice === 'mobile' && (
                <div className="mx-auto max-w-xs">
                  <div className="rounded-[2.5rem] bg-slate-900 p-3 shadow-2xl border border-slate-700">
                    <div className="relative bg-slate-100 rounded-[2rem] overflow-hidden text-slate-900">
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full bg-slate-900 z-20 flex items-center justify-end pr-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                      </div>
                      <SitePreviewMockup colors={colors} form={form} headerCfg={headerCfg} mockSearch={mockSearch} onSearchChange={setMockSearch} device="mobile" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-4 bg-white rounded-xl shadow-lg border border-gray-100 p-4 flex items-center justify-between z-20">
        <p className="text-sm text-gray-500">احفظ لتطبيق التغييرات على الموقع بالكامل</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: colors.primaryColor }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات والألوان'}
        </button>
      </div>
    </div>
  );
}

function SitePreviewMockup({
  colors,
  form,
  headerCfg,
  mockSearch,
  onSearchChange,
  device,
  compact = false,
}: {
  colors: ThemeColors;
  form: SiteSettings;
  headerCfg: { showLocationBar: boolean; showServiceBar: boolean; locationText: string; serviceText: string; showPrescriptionBar: boolean; prescriptionBarColor: string; topBarColor: string; topBarTextColor: string; showVoiceSearch: boolean; showBarcode: boolean; showTrendingTags: boolean; showWhatsAppButton: boolean; showCategoryPills: boolean };
  mockSearch: string;
  onSearchChange: (v: string) => void;
  device: 'desktop' | 'tablet' | 'mobile';
  compact?: boolean;
}) {
  const isMobile = device === 'mobile';
  const narrow = isMobile || compact;
  const basePx = compact ? 6 : device === 'mobile' ? 7 : device === 'tablet' ? 8.5 : 10;

  const navLinks = ['الرئيسية', 'الأدوية', 'الفيتامينات', 'العناية بالبشرة', 'الصيدليات', 'العروض'];

  const mockCategories = [
    { name: 'أدوية', emoji: '💊' },
    { name: 'فيتامينات', emoji: '🌞' },
    { name: 'العناية بالبشرة', emoji: '🧴' },
    { name: 'صحة الطفل', emoji: '🍼' },
    { name: 'أجهزة طبية', emoji: '🩺' },
    { name: 'مستلزمات', emoji: '🩹' },
  ];

  const mockProducts = [
    { name: 'بانادول', cat: 'مسكنات', price: 21, old: 27, emoji: '💊' },
    { name: 'فيتامين د', cat: 'مكمل غذائي', price: 49, old: 62, emoji: '🌞' },
    { name: 'أوجمنتين', cat: 'مضاد حيوي', price: 68, old: 85, emoji: '💉' },
    { name: 'بروفين', cat: 'مسكنات', price: 32, old: 40, emoji: '💊' },
    { name: 'سيروم فيتامين C', cat: 'بشرة', price: 95, old: 120, emoji: '🧴' },
    { name: 'ميزان حرارة', cat: 'أجهزة طبية', price: 45, old: 60, emoji: '🌡️' },
  ];

  const mockPharmacies = [
    { name: 'صيدلية النور', area: 'وسط البلد', dist: '1.2 كم', rating: 4.8, reviews: '320' },
    { name: 'صيدلية العائلة', area: 'المعادي', dist: '3.5 كم', rating: 4.6, reviews: '210' },
  ];

  const socialIcons = [Facebook, Instagram, Twitter];
  const shownProducts = compact ? mockProducts.slice(0, 3) : mockProducts;

  return (
    <div dir="rtl" style={{ fontSize: `${basePx}px` }} className="leading-snug text-right">
      {/* Announcement bar */}
      {!compact && form.announcement_active && form.announcement_text && (
        <div
          className="px-[1.2em] py-[0.5em] text-center text-[0.8em] font-bold text-white"
          style={{ background: `linear-gradient(90deg, ${colors.primaryColor}, ${colors.secondaryColor})` }}
        >
          {form.announcement_text}
        </div>
      )}

      {/* Top bar */}
      <div
        className="px-[1.2em] py-[0.45em] flex justify-between items-center text-[0.75em] font-semibold"
        style={{ backgroundColor: headerCfg.topBarColor, color: headerCfg.topBarTextColor }}
      >
        <span className="flex items-center gap-[0.4em]">
          <MapPin className="w-[0.9em] h-[0.9em]" style={{ color: colors.accentColor }} />
          {headerCfg.showLocationBar ? headerCfg.locationText : 'اختر موقعك'}
        </span>
        {headerCfg.showServiceBar && (
          <span className="flex items-center gap-[0.4em]">
            <span className="w-[0.55em] h-[0.55em] rounded-full animate-ping" style={{ backgroundColor: colors.accentColor }} />
            {headerCfg.serviceText}
          </span>
        )}
        {headerCfg.showPrescriptionBar && (
          <span
            className="flex items-center gap-[0.35em] px-[0.8em] py-[0.25em] rounded-full text-white font-bold"
            style={{ backgroundColor: headerCfg.prescriptionBarColor }}
          >
            <FileText className="w-[0.85em] h-[0.85em]" />
            رفع روشتة طبية
          </span>
        )}
      </div>

      {/* Main header */}
      <div
        className="px-[1.2em] py-[0.8em] flex items-center gap-[0.8em]"
        style={{ backgroundColor: colors.headerBg, color: colors.headerText }}
      >
        {narrow && <Menu className="w-[1.4em] h-[1.4em] shrink-0" />}
        <div className="flex items-center gap-[0.5em] shrink-0">
          <div className="w-[1.8em] h-[1.8em] rounded-[0.5em] flex items-center justify-center text-white shadow-md" style={{ backgroundColor: colors.primaryColor }}>
            <Cross className="w-[1em] h-[1em]" strokeWidth={3} />
          </div>
          {!narrow && <span className="font-black text-[1.05em]">{form.site_name}</span>}
        </div>

        {!narrow ? (
          <div className="flex-1 max-w-[26em] mx-auto flex items-center bg-white rounded-full border px-[1em] py-[0.45em] gap-[0.5em] shadow-sm" style={{ borderColor: `${colors.primaryColor}33` }}>
            <Search className="w-[0.9em] h-[0.9em] shrink-0" style={{ color: colors.primaryColor }} />
            <input
              value={mockSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={mockSearch ? '' : 'ابحث عن دواء، فيتامين، أو صيدلية...'}
              className="w-full bg-transparent text-[0.85em] font-medium text-gray-700 focus:outline-none placeholder:text-gray-300"
            />
            {headerCfg.showVoiceSearch && <Mic className="w-[0.85em] h-[0.85em] shrink-0 opacity-50" />}
            {headerCfg.showBarcode && <Barcode className="w-[0.85em] h-[0.85em] shrink-0 opacity-50" />}
            <span className="px-[1em] py-[0.4em] rounded-full text-white text-[0.72em] font-black shrink-0" style={{ backgroundColor: colors.primaryColor }}>
              بحث
            </span>
          </div>
        ) : (
          <div className="flex-1 flex items-center bg-white rounded-full border px-[0.9em] py-[0.5em] gap-[0.4em]" style={{ borderColor: `${colors.primaryColor}33` }}>
            <Search className="w-[0.9em] h-[0.9em] shrink-0" style={{ color: colors.primaryColor }} />
            <span className="text-[0.75em] text-gray-400 truncate">ابحث عن دواء...</span>
          </div>
        )}

        <div className="flex items-center gap-[0.7em] mr-auto">
          {!narrow && <Heart className="w-[1.15em] h-[1.15em]" />}
          {headerCfg.showWhatsAppButton && !narrow && (
            <span className="flex items-center gap-[0.3em] px-[0.8em] py-[0.35em] rounded-[0.6em] text-white text-[0.7em] font-extrabold" style={{ backgroundColor: '#0d9488' }}>
              <Send className="w-[0.75em] h-[0.75em]" />
              واتساب
            </span>
          )}
          <div className="relative">
            <ShoppingCart className="w-[1.25em] h-[1.25em]" />
            <span className="absolute -top-[0.4em] -right-[0.4em] w-[1em] h-[1em] rounded-full text-white flex items-center justify-center text-[0.62em] font-black" style={{ backgroundColor: colors.accentColor }}>
              2
            </span>
          </div>
          {!narrow && (
            <div className="w-[1.7em] h-[1.7em] rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-[1em] h-[1em]" />
            </div>
          )}
        </div>
      </div>

      {/* Category nav */}
      {headerCfg.showCategoryPills && (
        <div className="px-[1.2em] py-[0.6em] flex items-center gap-[0.5em] overflow-x-auto" style={{ backgroundColor: colors.headerNavBg, color: colors.headerNavText }}>
          {navLinks.map((l) => (
            <span
              key={l}
              className={`px-[0.9em] py-[0.4em] rounded-full text-[0.78em] font-bold whitespace-nowrap ${l === 'الأدوية' ? 'text-white shadow-sm' : ''}`}
              style={l === 'الأدوية' ? { backgroundColor: colors.primaryColor } : { backgroundColor: `${colors.headerNavText}12` }}
            >
              {l}
            </span>
          ))}
          <span className="px-[0.9em] py-[0.4em] rounded-full text-[0.78em] font-black whitespace-nowrap text-white" style={{ backgroundColor: colors.accentColor }}>
            خصم حتى 30%
          </span>
        </div>
      )}

      {/* Hero */}
      <div
        className="relative text-center px-[2em] pt-[2.2em] pb-[2.4em] space-y-[0.7em] overflow-hidden transition-colors duration-500"
        style={{
          background: `linear-gradient(135deg, ${colors.heroBgStart}, ${colors.heroBgMiddle}, ${colors.heroBgEnd})`,
          color: colors.heroText,
        }}
      >
        <div className="absolute -top-[4em] -right-[4em] w-[14em] h-[14em] rounded-full blur-[2.5em] animate-pulse" style={{ backgroundColor: colors.primaryColor, opacity: 0.18 }} />
        <div className="absolute -bottom-[5em] -left-[4em] w-[12em] h-[12em] rounded-full blur-[2.5em] animate-float" style={{ backgroundColor: colors.secondaryColor, opacity: 0.16 }} />

        {!narrow && (
          <>
            <div className="absolute top-[1em] right-[1em] hidden sm:flex items-center gap-[0.4em] px-[0.8em] py-[0.4em] rounded-lg bg-white/85 shadow-md border text-[0.7em] font-bold animate-float" style={{ borderColor: `${colors.primaryColor}22`, color: colors.heroText }}>
              <Truck className="w-[0.9em] h-[0.9em]" style={{ color: colors.primaryColor }} />
              توصيل فوري
            </div>
            <div className="absolute bottom-[1em] left-[1em] hidden sm:flex items-center gap-[0.4em] px-[0.8em] py-[0.4em] rounded-lg bg-white/85 shadow-md border text-[0.7em] font-bold animate-float" style={{ borderColor: `${colors.accentColor}33`, color: colors.heroText, animationDelay: '1.2s' }}>
              خصومات حتى 30%
              <span className="w-[0.5em] h-[0.5em] rounded-full" style={{ backgroundColor: colors.accentColor }} />
            </div>
          </>
        )}

        <div className="relative">
          <span
            className="inline-block px-[1em] py-[0.4em] rounded-full text-[0.72em] font-bold border"
            style={{ backgroundColor: `${colors.primaryColor}15`, color: colors.primaryColor, borderColor: `${colors.primaryColor}30` }}
          >
            المنصة الأولى للأدوية
          </span>
          <h4 className="font-black text-[1.6em] leading-tight mt-[0.35em]">{form.hero_title || 'اعثر على دوائك في أقرب صيدلية'}</h4>
          <p className="text-[0.85em] opacity-80 max-w-[36em] mx-auto mt-[0.35em]">{form.hero_subtitle}</p>

          <div className="max-w-[26em] mx-auto mt-[1em] flex items-center bg-white rounded-full border p-[0.35em] shadow-lg" style={{ borderColor: `${colors.primaryColor}33` }}>
            <Search className="w-[1em] h-[1em] mr-[0.9em] shrink-0" style={{ color: colors.primaryColor }} />
            <input
              value={mockSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={mockSearch ? '' : 'اسم الدواء أو الباركود...'}
              className="flex-1 w-full min-w-0 bg-transparent text-[0.82em] text-gray-500 focus:outline-none placeholder:text-gray-300"
            />
            <span className="flex items-center gap-[0.4em] px-[1.1em] py-[0.5em] rounded-full text-white text-[0.78em] font-black shrink-0" style={{ backgroundColor: colors.heroBtnBg, color: colors.heroBtnText }}>
              <Search className="w-[0.85em] h-[0.85em]" />
              بحث
            </span>
          </div>

          <div className="flex items-center justify-center gap-[0.6em] mt-[1em] flex-wrap">
            <span className="flex items-center gap-[0.35em] text-[0.78em] font-bold opacity-80">
              <Sparkles className="w-[0.9em] h-[0.9em]" style={{ color: colors.accentColor }} />
              الأكثر بحثاً:
            </span>
            {['بنادول اكسترا', 'كونجستال', 'أوميجا 3 بلس'].map((item) => (
              <span key={item} className="px-[0.9em] py-[0.3em] rounded-full border bg-white text-[0.72em] font-bold" style={{ borderColor: `${colors.primaryColor}33`, color: colors.primaryColor }}>
                {item}
              </span>
            ))}
          </div>

          {!compact && (
            <div className="flex items-center justify-center gap-[1.3em] mt-[1em] text-[0.7em] font-bold">
              <span className="flex items-center gap-[0.4em]"><Truck className="w-[0.95em] h-[0.95em]" /> توصيل سريع</span>
              <span className="flex items-center gap-[0.4em]"><ShieldCheck className="w-[0.95em] h-[0.95em]" /> منتجات أصلية</span>
              <span className="flex items-center gap-[0.4em]"><Phone className="w-[0.95em] h-[0.95em]" /> دعم 24/7</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {!compact && (
      <div className="px-[1.2em] py-[1em] grid grid-cols-4 gap-[0.8em]" style={{ backgroundColor: colors.statsCardBg, color: colors.statsCardText }}>
        {[
          { n: '5+', l: 'صيدلية شريكة', c: colors.primaryColor },
          { n: '10k+', l: 'عميل سعيد', c: colors.secondaryColor },
          { n: '500+', l: 'منتج دوائي', c: colors.accentColor },
          { n: '24/7', l: 'طوارئ ودعم', c: colors.primaryColor },
        ].map((s) => (
          <div key={s.l} className="text-center">
            <p className="font-black text-[1.5em]" style={{ color: s.c }}>{s.n}</p>
            <p className="text-[0.7em] opacity-75 font-bold mt-[0.2em]">{s.l}</p>
          </div>
        ))}
      </div>
      )}

      {/* Categories */}
      {!compact && (
      <div className="px-[1.2em] py-[1em] bg-white">
        <div className="flex items-center justify-between mb-[0.8em]">
          <span className="text-[1em] font-black text-gray-800">تسوق حسب الفئة</span>
          <span className="flex items-center gap-[0.3em] text-[0.72em] font-bold" style={{ color: colors.primaryColor }}>
            عرض الكل
            <ChevronDown className="w-[0.9em] h-[0.9em] -rotate-90" />
          </span>
        </div>
        <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-6'} gap-[0.7em]`}>
          {mockCategories.map((c) => (
            <div key={c.name} className="rounded-xl border border-gray-100 p-[0.8em] text-center bg-gray-50 hover:shadow-md hover:-translate-y-[0.1em] transition-all cursor-pointer">
              <span className="text-[1.6em] block mb-[0.3em]">{c.emoji}</span>
              <p className="text-[0.76em] font-bold text-gray-700 truncate">{c.name}</p>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Products */}
      <div className="px-[1.2em] py-[1em] bg-gray-50">
        <div className="flex items-center justify-between mb-[0.8em]">
          <span className="text-[1em] font-black text-gray-800">عروض وتخفيضات خاصة</span>
          <span className="flex items-center gap-[0.3em] text-[0.72em] font-bold" style={{ color: colors.primaryColor }}>
            عرض كل العروض
            <ChevronDown className="w-[0.9em] h-[0.9em] -rotate-90" />
          </span>
        </div>
        <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-[0.8em]`}>
          {shownProducts.map((p) => (
            <div key={p.name} className="rounded-xl bg-white border border-gray-100 p-[0.8em] relative shadow-sm hover:-translate-y-[0.15em] hover:shadow-md transition-all cursor-pointer">
              <span className="absolute top-[0.5em] right-[0.5em] px-[0.55em] py-[0.2em] rounded-full text-white text-[0.62em] font-black" style={{ backgroundColor: colors.accentColor }}>
                -{Math.round((1 - p.price / p.old) * 100)}%
              </span>
              <div className="h-[4.5em] rounded-lg flex items-center justify-center mb-[0.6em]" style={{ background: `linear-gradient(135deg, ${colors.primaryColor}1a, ${colors.primaryColor}08)` }}>
                <span className="text-[2em] leading-none">{p.emoji}</span>
              </div>
              <p className="text-[0.82em] font-bold text-gray-800 truncate">{p.name}</p>
              <p className="text-[0.68em] text-gray-400 mb-[0.45em]">{p.cat}</p>
              <div className="flex items-center justify-between">
                <span className="text-[0.9em] font-black" style={{ color: colors.primaryColor }}>
                  {p.price}
                  <span className="text-[0.58em] font-bold mr-[0.2em]">ج.م</span>
                </span>
                <span className="text-[0.68em] text-gray-400 line-through">{p.old}</span>
                <span className="w-[1.6em] h-[1.6em] rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: colors.primaryColor }}>
                  <ShoppingCart className="w-[0.85em] h-[0.85em]" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pharmacies */}
      {!compact && (
      <div className="px-[1.2em] py-[1em] bg-white">
        <div className="flex items-center justify-between mb-[0.8em]">
          <span className="text-[1em] font-black text-gray-800">الصيدليات الشريكة</span>
          <span className="flex items-center gap-[0.3em] text-[0.72em] font-bold" style={{ color: colors.primaryColor }}>
            عرض الكل
            <ChevronDown className="w-[0.9em] h-[0.9em] -rotate-90" />
          </span>
        </div>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-[0.8em]`}>
          {mockPharmacies.map((ph) => (
            <div
              key={ph.name}
              className="rounded-xl p-[0.9em] border-2 bg-white transition-all cursor-pointer"
              style={{ borderColor: colors.pharmacyHoverBorder, boxShadow: `0 6px 16px ${colors.pharmacyHoverBorder}25` }}
            >
              <div className="flex items-center gap-[0.8em]">
                <div className="w-[2.6em] h-[2.6em] rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: colors.primaryColor }}>
                  <Cross className="w-[1.3em] h-[1.3em]" strokeWidth={3} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-[0.92em] text-gray-800 truncate">{ph.name}</p>
                    <span className="flex items-center gap-[0.3em] px-[0.65em] py-[0.22em] rounded-full text-[0.62em] font-black" style={{ backgroundColor: `${colors.primaryColor}15`, color: colors.primaryColor }}>
                      <span className="w-[0.5em] h-[0.5em] rounded-full animate-pulse" style={{ backgroundColor: colors.primaryColor }} />
                      مفتوح
                    </span>
                  </div>
                  <div className="flex items-center gap-[0.7em] text-[0.68em] text-gray-400 mt-[0.3em]">
                    <span className="flex items-center gap-[0.3em]"><MapPin className="w-[0.85em] h-[0.85em]" />{ph.area} - {ph.dist}</span>
                    <span className="flex items-center gap-[0.2em]">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-[0.8em] h-[0.8em] ${i < Math.floor(ph.rating) ? '' : 'opacity-30'}`} style={{ color: colors.accentColor }} fill={colors.accentColor} />
                      ))}
                      <span className="text-[0.78em] font-bold text-gray-500 mr-[0.15em]">{ph.rating} ({ph.reviews})</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-[0.5em] mt-[0.8em]">
                <span className="flex-1 text-center px-[0.9em] py-[0.5em] rounded-lg text-white text-[0.72em] font-black" style={{ backgroundColor: colors.primaryColor }}>
                  تصفح الأدوية
                </span>
                <span className="px-[0.9em] py-[0.5em] rounded-lg text-[0.72em] font-black border" style={{ color: colors.primaryColor, borderColor: `${colors.primaryColor}40` }}>
                  الاتجاهات
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Emergency CTA */}
      {!compact && (
      <div className="px-[1.4em] py-[1.6em] text-center" style={{ background: `linear-gradient(135deg, ${colors.primaryColor}, ${colors.secondaryColor})` }}>
        <p className="text-white text-[1.15em] font-black mb-[0.3em]">مش لاقي دواك؟ احنا نجيبهولك!</p>
        <p className="text-white/80 text-[0.72em] mb-[1em]">ابعت الروشتة أو امسح الباركود وهنوفرهولك في أقرب صيدلية فوراً</p>
        <div className="flex items-center justify-center gap-[0.7em] flex-wrap">
          <span className="inline-flex items-center gap-[0.5em] px-[1.2em] py-[0.7em] rounded-full bg-white text-[0.78em] font-black shadow-lg" style={{ color: colors.primaryColor }}>
            <TrendingDown className="w-[1em] h-[1em]" />
            امسح صندوق الدواء
          </span>
          <span className="inline-flex items-center gap-[0.5em] px-[1.2em] py-[0.7em] rounded-full border-2 border-white/70 text-white text-[0.78em] font-black">
            <Phone className="w-[1em] h-[1em]" />
            اتصل بنا
          </span>
        </div>
      </div>
      )}

      {/* Footer */}
      <div style={{ backgroundColor: colors.footerBg, color: colors.footerText }}>
        <div className="px-[1.4em] py-[1.2em] text-center border-b border-white/10">
          <p className="text-[0.95em] font-bold mb-[0.6em]">اشترك في النشرة الطبية وخصومات الأدوية</p>
          <div className="max-w-[24em] mx-auto flex items-center bg-white/10 rounded-full border overflow-hidden" style={{ borderColor: `${colors.footerText}22` }}>
            <input
              value={mockSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={mockSearch ? '' : 'أدخل بريدك الإلكتروني...'}
              className="flex-1 w-full min-w-0 px-[1em] py-[0.55em] bg-transparent text-[0.8em] text-white/80 focus:outline-none placeholder:text-white/40"
            />
            <span className="px-[1.1em] py-[0.55em] bg-white text-[0.72em] font-black whitespace-nowrap" style={{ color: colors.primaryColor }}>
              اشترك
            </span>
          </div>
        </div>

        {!compact && (
        <div className={`px-[1.4em] py-[1em] grid ${isMobile ? 'grid-cols-1 gap-[1em]' : 'grid-cols-3 gap-[1.4em]'}`}>
          <div>
            <div className="flex items-center gap-[0.5em] mb-[0.6em]">
              <div className="w-[1.8em] h-[1.8em] rounded-[0.5em] flex items-center justify-center text-white" style={{ backgroundColor: colors.primaryColor }}>
                <Cross className="w-[1em] h-[1em]" strokeWidth={3} />
              </div>
              <span className="font-black text-[1em]">{form.site_name}</span>
            </div>
            <p className="text-[0.72em] opacity-70 leading-relaxed max-w-[28em]">{form.site_description || 'منصتك الموثوقة للبحث عن الأدوية وأقرب صيدلية بكل سهولة وأمان'}</p>
            <div className="flex items-center gap-[0.5em] mt-[0.8em]">
              {socialIcons.map((Icon, i) => (
                <span key={i} className="w-[1.8em] h-[1.8em] rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <Icon className="w-[0.9em] h-[0.9em]" />
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[0.85em] font-black mb-[0.6em]">روابط سريعة</p>
            <div className="space-y-[0.4em] text-[0.72em] opacity-80">
              {['الرئيسية', 'الأدوية', 'الفيتامينات', 'الصيدليات', 'العروض'].map((l) => (
                <p key={l} className="hover:opacity-100 cursor-pointer">{l}</p>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[0.85em] font-black mb-[0.6em]">تواصل معنا</p>
            <div className="space-y-[0.45em] text-[0.72em] opacity-80">
              <p className="flex items-center gap-[0.4em]"><Phone className="w-[0.85em] h-[0.85em]" />{form.contact_phone || '16000'}</p>
              <p className="flex items-center gap-[0.4em]"><Mail className="w-[0.85em] h-[0.85em]" />{form.contact_email || 'info@pharmacy.com'}</p>
              <p className="flex items-center gap-[0.4em]"><MapPin className="w-[0.85em] h-[0.85em]" />{form.contact_address || 'القاهرة، مصر'}</p>
            </div>
          </div>
        </div>
        )}

        <div className="px-[1.4em] py-[0.9em] border-t border-white/10 flex items-center justify-between text-[0.68em] opacity-60">
          <p>جميع الحقوق محفوظة © 2026 {form.site_name}</p>
          <p>شروط الاستخدام • سياسة الخصوصية</p>
        </div>
      </div>
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

// ===== Visual mock helpers for the color editor =====
function ColorGroup({
  num,
  title,
  location,
  hint,
  visual,
  children,
}: {
  num: string;
  title: string;
  location: string;
  hint: string;
  visual: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
      <div className="relative p-3 border-b border-gray-100 bg-slate-50/70">
        <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-900/80 text-white text-[9px] font-bold shadow-sm">
          <MapPin className="w-2.5 h-2.5" />
          {location}
        </span>
        {visual}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-6 rounded-lg bg-gray-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">{num}</span>
          <h4 className="text-xs font-black text-gray-900">{title}</h4>
        </div>
        <p className="text-[11px] text-gray-400 mb-3">{hint}</p>
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
}

function IdentityVisual({ colors }: { colors: ThemeColors }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-black shadow-sm" style={{ backgroundColor: colors.primaryColor }}>+</span>
        <span className="text-xs font-black" style={{ color: colors.headerText }}>صيدليتي</span>
      </div>
      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: colors.primaryColor }}>اشترِ الآن</span>
      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ backgroundColor: `${colors.secondaryColor}1a`, color: colors.secondaryColor }}>عروض</span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-black border-2" style={{ color: colors.accentColor, borderColor: colors.accentColor }}>خصم 20%</span>
      <div className="h-2.5 w-12 rounded-full" style={{ background: `linear-gradient(to left, ${colors.primaryColor}, ${colors.secondaryColor})` }} />
    </div>
  );
}

function HeaderVisual({ colors }: { colors: ThemeColors }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-300/60 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-1 text-[9px] font-bold" style={{ backgroundColor: colors.headerBg, color: colors.headerText }}>
        <MapPin className="w-2.5 h-2.5" style={{ color: colors.accentColor }} />
        <span className="opacity-80">القاهرة - المعادي</span>
        <span className="mr-auto flex items-center gap-1 opacity-80">
          <Truck className="w-2.5 h-2.5" style={{ color: colors.primaryColor }} />
          توصيل سريع
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: colors.headerBg, color: colors.headerText }}>
        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0" style={{ backgroundColor: colors.primaryColor }}>+</span>
        <span className="text-[10px] font-black shrink-0" style={{ color: colors.headerText }}>صيدليتي</span>
        <div className="flex-1 h-6 rounded-full border flex items-center px-2 gap-1 text-[8px] min-w-0" style={{ borderColor: `${colors.headerText}2e`, color: colors.headerText }}>
          <Search className="w-2.5 h-2.5 shrink-0 opacity-60" />
          <span className="truncate opacity-70">ابحث عن دوائك...</span>
        </div>
        <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${colors.primaryColor}15`, color: colors.primaryColor }}>
          <Heart className="w-3 h-3" />
        </span>
        <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${colors.headerText}08`, color: colors.headerText }}>
          <ShoppingCart className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

function NavVisual({ colors }: { colors: ThemeColors }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-300/60 shadow-sm">
      <div className="flex items-center gap-1.5 px-3 py-2.5 overflow-hidden" style={{ backgroundColor: colors.headerNavBg, color: colors.headerNavText }}>
        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold whitespace-nowrap" style={{ backgroundColor: `${colors.headerNavText}15`, color: colors.headerNavText, border: `1px solid ${colors.headerNavText}22` }}>
          <span className="inline-flex items-center gap-1"><Menu className="w-2 h-2" /> جميع الأقسام</span>
        </span>
        {['أدوية', 'عناية', 'أطفال', 'فيتامينات', '24/7'].map((c, i) => (
          <span key={c} className="px-2 py-0.5 rounded-full text-[8px] font-bold whitespace-nowrap opacity-75" style={{ color: colors.headerNavText }}>
            {i === 1 && <Sparkles className="w-2 h-2 inline" style={{ color: colors.accentColor }} />} {c}
          </span>
        ))}
        <span className="w-1.5 h-1.5 rounded-full ml-auto shrink-0" style={{ backgroundColor: colors.accentColor }} />
      </div>
    </div>
  );
}

function HeroVisual({ colors }: { colors: ThemeColors }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-300/60 shadow-sm">
      <div className="px-4 py-4 text-center space-y-2" style={{ background: `linear-gradient(135deg, ${colors.heroBgStart}, ${colors.heroBgMiddle}, ${colors.heroBgEnd})` }}>
        <p className="text-[10px] font-black" style={{ color: colors.heroText }}>اعثر على دوائك في أقرب صيدلية</p>
        <p className="text-[8px] font-bold opacity-75" style={{ color: colors.heroText }}>قارن الأسعار واطلب التوصيل حتى باب منزلك</p>
        <div className="flex items-center gap-1 bg-white rounded-full p-1 max-w-[210px] mx-auto shadow-sm">
          <span className="flex-1 text-[8px] text-gray-400 px-2 truncate">ابحث عن دواء...</span>
          <span className="px-2 py-1 rounded-full text-[8px] font-black flex items-center gap-1 shrink-0" style={{ backgroundColor: colors.heroBtnBg, color: colors.heroBtnText }}>
            <Search className="w-2.5 h-2.5" />
            بحث
          </span>
        </div>
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          <span className="text-[7px] font-bold opacity-70" style={{ color: colors.heroText }}>الأكثر بحثاً:</span>
          <span className="px-1.5 py-px rounded-full bg-white text-[7px] font-bold shadow-xs" style={{ color: colors.primaryColor }}>بنادول</span>
          <span className="px-1.5 py-px rounded-full bg-white text-[7px] font-bold shadow-xs" style={{ color: colors.secondaryColor }}>أوجمنتين</span>
        </div>
      </div>
    </div>
  );
}

function StatsVisual({ colors }: { colors: ThemeColors }) {
  const stats = [
    { v: '1,200+', l: 'صيدلية شريكة' },
    { v: '10k+', l: 'منتج طبي' },
    { v: '24/7', l: 'توصيل سريع' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div key={s.l} className="rounded-xl border border-gray-200 p-2 text-center shadow-sm" style={{ backgroundColor: colors.statsCardBg }}>
          <p className="text-[11px] font-black" style={{ color: colors.statsCardText }}>{s.v}</p>
          <p className="text-[8px] font-bold opacity-70" style={{ color: colors.statsCardText }}>{s.l}</p>
        </div>
      ))}
    </div>
  );
}

function PharmacyCardVisual({ colors }: { colors: ThemeColors }) {
  return (
    <div className="rounded-xl border-2 p-2.5 bg-white shadow-sm" style={{ borderColor: colors.pharmacyHoverBorder }}>
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${colors.primaryColor}15`, color: colors.primaryColor }}>
          <Store className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black text-gray-800">صيدلية المعادي</p>
          <p className="text-[7px] font-bold text-gray-400 truncate">مفتوحة الآن - خدمة 24 ساعة</p>
        </div>
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-black shrink-0" style={{ backgroundColor: colors.primaryColor }}>+</span>
      </div>
      <div className="flex items-center gap-0.5 mt-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className="w-2.5 h-2.5 fill-current" style={{ color: colors.accentColor }} />
        ))}
      </div>
    </div>
  );
}

function FooterVisual({ colors }: { colors: ThemeColors }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-300/60 shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ backgroundColor: colors.footerBg }}>
        <div className="space-y-1 min-w-0">
          <p className="text-[9px] font-black" style={{ color: colors.footerText }}>روابط سريعة</p>
          <p className="text-[7px] font-bold opacity-80" style={{ color: colors.footerText }}>الرئيسية - العروض - تواصل معنا</p>
          <p className="text-[7px] font-bold opacity-60" style={{ color: colors.footerText }}>© 2026 صيدليتي</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: colors.primaryColor }}>
            <Facebook className="w-3 h-3" />
          </span>
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colors.primaryColor}20`, color: colors.primaryColor }}>
            <Instagram className="w-3 h-3" />
          </span>
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colors.primaryColor}20`, color: colors.primaryColor }}>
            <Twitter className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
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
