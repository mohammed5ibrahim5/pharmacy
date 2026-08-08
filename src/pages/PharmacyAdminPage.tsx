import { useState, useEffect } from 'react';
import {
  Menu, X, LogOut, ArrowLeft, Loader2, Store, Package, ShoppingCart,
  Mail, Lock, Eye, EyeOff, AlertCircle, LayoutDashboard, Settings, ExternalLink,
  Phone, MapPin, Star, Clock, Truck, Shield,
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { usePharmacyOwner } from '@/context/PharmacyOwnerContext';
import { ProductsTab, OrdersTab, PharmacyForm } from '@/pages/AdminPage';
import { supabase } from '@/lib/supabase';
import type { Pharmacy } from '@/types';

type OwnerTab = 'overview' | 'profile' | 'products' | 'orders';

function OwnerLogin() {
  const { settings } = useSettings();
  const { login } = usePharmacyOwner();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setLoading(true);
    const { error: loginError } = await login(email, password);
    setLoading(false);
    if (loginError) setError(loginError);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" dir="rtl">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: settings.primary_color }} />
        <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: settings.accent_color }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ backgroundColor: settings.primary_color }}>
            <Store className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white">لوحة إدارة الصيدلية</h1>
          <p className="text-gray-400 text-sm mt-2">تسجيل دخول مالك الصيدلية</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-transparent focus:ring-2 text-sm"
                  style={{ ['--tw-ring-color' as string]: settings.primary_color }}
                  placeholder="owner@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full pr-11 pl-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-transparent focus:ring-2 text-sm"
                  style={{ ['--tw-ring-color' as string]: settings.primary_color }}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: settings.primary_color }}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>دخول <ArrowLeft className="w-5 h-5" /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">هذه الصفحة خاصة بأصحاب الصيدليات لإدارة صيدلياتهم فقط</p>
      </div>
    </div>
  );
}

function OwnerOverview({ pharmacy, onNavigate }: { pharmacy: Pharmacy; onNavigate: (tab: OwnerTab) => void }) {
  const { settings } = useSettings();
  const [stats, setStats] = useState<{ products: number; available: number; orders: number; pending: number } | null>(null);

  useEffect(() => {
    if (!pharmacy) return;
    Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('pharmacy_id', pharmacy.id),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('pharmacy_id', pharmacy.id).eq('is_available', true),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('pharmacy_id', pharmacy.id),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('pharmacy_id', pharmacy.id).eq('status', 'pending'),
    ]).then(([p, a, o, pend]) => {
      setStats({
        products: p.count || 0,
        available: a.count || 0,
        orders: o.count || 0,
        pending: pend.count || 0,
      });
    });
  }, [pharmacy]);

  const statCards = [
    { label: 'عدد المنتجات', value: stats?.products, icon: <Package className="w-5 h-5" />, bg: 'bg-blue-50 text-blue-600 border-blue-200' },
    { label: 'منتج متوفر', value: stats?.available, icon: <CheckIcon />, bg: 'bg-teal-50 text-teal-600 border-teal-200' },
    { label: 'إجمالي الطلبات', value: stats?.orders, icon: <ShoppingCart className="w-5 h-5" />, bg: 'bg-amber-50 text-amber-600 border-amber-200' },
    { label: 'طلبات قيد المراجعة', value: stats?.pending, icon: <Clock className="w-5 h-5" />, bg: 'bg-violet-50 text-violet-600 border-violet-200' },
  ];

  return (
    <div className="space-y-5">
      {/* Pharmacy header card */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="h-28 relative" style={{ background: pharmacy.cover_url ? `url(${pharmacy.cover_url}) center/cover` : `linear-gradient(135deg, ${settings.primary_color}33, ${settings.secondary_color}55)` }}>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="p-5 -mt-10 relative">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border-4 border-white shadow-lg" style={{ backgroundColor: settings.primary_color }}>
              {pharmacy.logo_url ? <img src={pharmacy.logo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-black text-2xl">{pharmacy.name.charAt(0)}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-gray-900 truncate">{pharmacy.name}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${pharmacy.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{pharmacy.is_active ? 'نشطة' : 'متوقفة'}</span>
                {pharmacy.is_24h && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-900 text-white"><Clock className="inline w-3 h-3 -mt-0.5" /> 24 ساعة</span>}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" />{pharmacy.area || pharmacy.address}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                {pharmacy.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{pharmacy.phone}</span>}
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{pharmacy.rating}</span>
                {pharmacy.delivery_available && <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" />توصيل</span>}
                {pharmacy.accept_insurance && <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" />تأمين</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onNavigate('profile')} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all" style={{ backgroundColor: settings.primary_color }}>
                <Settings className="w-3.5 h-3.5" /> تعديل البيانات
              </button>
              <a
                href={`${window.location.origin}/#/pharmacy/${pharmacy.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all"
                style={{ color: settings.primary_color, borderColor: `${settings.primary_color}33`, backgroundColor: `${settings.primary_color}0d` }}
              >
                <ExternalLink className="w-3.5 h-3.5" /> صفحة الصيدلية
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${s.bg}`}>{s.icon}</div>
            <div>
              <p className="text-xl font-black text-gray-900">{s.value ?? '—'}</p>
              <p className="text-[11px] font-bold text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => onNavigate('products')} className="group bg-white rounded-2xl border border-gray-100 p-5 text-right hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${settings.primary_color}12`, color: settings.primary_color }}>
            <Package className="w-5 h-5" />
          </div>
          <h3 className="font-black text-gray-900 text-sm">إدارة المنتجات</h3>
          <p className="text-xs text-gray-500 mt-1">أضف وعدّل منتجات صيدليتك وأسعارها ومخزونها وتوفرها.</p>
        </button>
        <button onClick={() => onNavigate('orders')} className="group bg-white rounded-2xl border border-gray-100 p-5 text-right hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${settings.primary_color}12`, color: settings.primary_color }}>
            <ShoppingCart className="w-5 h-5" />
          </div>
          <h3 className="font-black text-gray-900 text-sm">طلبات صيدليتك</h3>
          <p className="text-xs text-gray-500 mt-1">تابع طلبات العملاء الخاصة بصيدليتك وحدّث حالاتها.</p>
        </button>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function OwnerDashboard() {
  const { settings } = useSettings();
  const { owner, pharmacy, logout, refresh } = usePharmacyOwner();
  const [activeTab, setActiveTab] = useState<OwnerTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (!pharmacy) return null;

  const navItems: { id: OwnerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'profile', label: 'بيانات الصيدلية', icon: <Settings className="w-5 h-5" /> },
    { id: 'products', label: 'المنتجات', icon: <Package className="w-5 h-5" /> },
    { id: 'orders', label: 'الطلبات', icon: <ShoppingCart className="w-5 h-5" /> },
  ];

  const goHome = () => {
    window.location.href = '/';
  };

  const goToTab = (tab: OwnerTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 right-0 z-50 w-72 bg-gray-900 text-white shadow-2xl transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: settings.primary_color }}>
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-sm truncate max-w-[180px]">{pharmacy.name}</h2>
                <p className="text-xs text-gray-400">لوحة إدارة الصيدلية</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" aria-label="إغلاق القائمة">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto pb-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => goToTab(item.id)}
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
              <p className="text-xs text-gray-300 truncate">{owner?.full_name || ''}</p>
              <p className="text-[10px] text-gray-500 truncate" dir="ltr">{owner?.email}</p>
            </div>
            <button onClick={goHome} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              عرض الموقع
            </button>
            <button
              onClick={() => { logout(); }}
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
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors" aria-label="فتح القائمة">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">{navItems.find((n) => n.id === activeTab)?.label}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              متصل
            </span>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: settings.primary_color }}>
              {(owner?.full_name?.charAt(0) || 'م')}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'overview' && <OwnerOverview pharmacy={pharmacy} onNavigate={goToTab} />}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-gray-900 text-sm">بيانات الصيدلية</h3>
                    <p className="text-xs text-gray-500 mt-1">عدّل صورة الصيدلية وأرقام التواصل والعبارات وكل البيانات الخاصة بها. التعديلات تظهر على الموقع فوراً.</p>
                  </div>
                  <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all" style={{ backgroundColor: settings.primary_color }}>
                    <Settings className="w-3.5 h-3.5" /> تعديل بيانات الصيدلية
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                  <Field label="اسم الصيدلية"><p className="text-sm font-bold text-gray-800">{pharmacy.name}</p></Field>
                  <Field label="المنطقة / المدينة"><p className="text-sm font-bold text-gray-800">{pharmacy.area || pharmacy.city || '—'}</p></Field>
                  <Field label="رقم الهاتف"><p className="text-sm font-bold text-gray-800" dir="ltr">{pharmacy.phone || '—'}</p></Field>
                  <Field label="واتساب"><p className="text-sm font-bold text-gray-800" dir="ltr">{pharmacy.whatsapp || '—'}</p></Field>
                  <Field label="البريد الإلكتروني"><p className="text-sm font-bold text-gray-800" dir="ltr">{pharmacy.email || '—'}</p></Field>
                  <Field label="ساعات العمل"><p className="text-sm font-bold text-gray-800">{pharmacy.opening_hours || '—'}</p></Field>
                  <Field label="العنوان"><p className="text-sm font-bold text-gray-800">{pharmacy.address}</p></Field>
                  <Field label="الوصف"><p className="text-sm font-bold text-gray-800">{pharmacy.description || '—'}</p></Field>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'products' && <ProductsTab pharmacyId={pharmacy.id} />}
          {activeTab === 'orders' && <OrdersTab pharmacyId={pharmacy.id} />}
        </div>
      </main>

      {editOpen && (
        <PharmacyForm
          pharmacy={pharmacy}
          onClose={() => setEditOpen(false)}
          onSaved={() => { refresh(); setEditOpen(false); }}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  );
}

export function PharmacyAdminPage() {
  const { owner, loading } = usePharmacyOwner();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!owner) {
    return <OwnerLogin />;
  }

  return <OwnerDashboard />;
}
