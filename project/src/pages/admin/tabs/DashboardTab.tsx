import { useState, useEffect } from 'react';
import {
  Wallet, ShoppingCart, Store, Package, List, TrendingDown, Ticket, Users,
  BellRing, Sparkles, Activity, Loader2, Ban, MessageCircle, BadgePercent,
  Save, AlertTriangle, RefreshCw, Cross,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings, type WelcomePopupConfig } from '@/context/SettingsContext';
import type { Pharmacy, Product } from '@/types';

export function DashboardTab() {
  const { settings, storeConfig, welcomeConfig, refresh } = useSettings();
  const [togglingPurchases, setTogglingPurchases] = useState(false);
  const [togglingCatalogMultiPharmacy, setTogglingCatalogMultiPharmacy] = useState(false);
  const [stats, setStats] = useState({ pharmacies: 0, products: 0, categories: 0, discounts: 0, coupons: 0, customers: 0, orders: 0, revenue: 0, stockAlerts: 0, loyaltyPoints: 0 });
  const [recentPharmacies, setRecentPharmacies] = useState<Pharmacy[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; count: number; revenue: number }[]>([]);
  const [weekChart, setWeekChart] = useState<{ day: string; count: number }[]>([]);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);
  const [dashReload, setDashReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setDashLoading(true);
      setDashError(null);
      try {
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
        if (cancelled) return;
        const ordersData = (orders.data || []) as { product_id: string; total_price: number; status: string; created_at: string; product?: { name: string } | { name: string }[] | null }[];
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
          if (!byProduct[o.product_id]) byProduct[o.product_id] = { name: Array.isArray(o.product) ? (o.product[0]?.name || 'منتج محذوف') : (o.product?.name || 'منتج محذوف'), count: 0, revenue: 0 };
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
      } catch (e) {
        if (!cancelled) setDashError((e as Error)?.message || 'تعذر تحميل الإحصائيات.');
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    };
    fetch();
    return () => {
      cancelled = true;
    };
  }, [dashReload]);

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
    } catch { /* ignore toggle error */ } finally {
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
    } catch { /* ignore toggle error */ } finally {
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
    } catch { /* ignore toggle error */ } finally {
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
    } catch {
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

      {dashError && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
          <p className="text-sm font-black text-rose-700">تعذر تحميل إحصائيات لوحة التحكم. تحقق من اتصالك وحاول مرة أخرى.</p>
          <button
            type="button"
            onClick={() => setDashReload((c) => c + 1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 active:scale-95 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            إعادة المحاولة
          </button>
        </div>
      )}

      {dashLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="w-12 h-12 rounded-xl mb-3 skeleton" />
              <div className="h-6 w-16 rounded-md skeleton mb-2" />
              <div className="h-3 w-24 rounded-md skeleton" />
            </div>
          ))}
        </div>
      ) : (
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
      )}

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
