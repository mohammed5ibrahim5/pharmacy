import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Eye, ShoppingCart, XCircle, Store, Ticket, RefreshCw,
  Loader2, AlertTriangle, BarChart3, SearchCheck, ScrollText, BadgePercent,
  PackageCheck, TrendingUp, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { ORDER_STATUS_META } from '@/lib/orders';

interface SeriesPoint { day: string; count: number }
interface AnalyticsPayload {
  range_days: number;
  generated_at: string;
  visits: { total: number; today: number; prev_week: number; last7: SeriesPoint[] };
  conversions: { total: number; today: number; prev_week: number; last7: SeriesPoint[] };
  searched: { keyword: string; search_count: number; product_name: string | null; purchased: boolean }[];
  cancellation: { total: number; cancelled: number; by_status: Record<string, number> };
  pharmacies: { id: string; name: string; orders: number; revenue: number; cancelled: number }[];
  revenue: {
    loyalty_count: number; loyalty_total: number;
    sub_active: number; sub_orders: number; sub_revenue: number;
    coupon_issued: number; coupon_active: number; coupon_used: number; coupon_discount: number;
  };
  audit: { id: number; admin_email: string; action: string; entity_table: string; entity_id: string; summary: string; created_at: string }[];
}

const TABLE_LABELS: Record<string, string> = {
  orders: 'الطلبات',
  order_groups: 'مجموعات الطلبات',
  products: 'المنتجات',
  pharmacies: 'الصيدليات',
  categories: 'الفئات',
  discounts: 'الخصومات',
  coupons: 'أكواد الخصم',
  customers: 'العملاء',
  prescriptions: 'الروشتات',
  chronic_subscriptions: 'الاشتراكات',
  site_settings: 'إعدادات الموقع',
  loyalty_transactions: 'حركات النقاط',
};

function fmtMoney(n: number): string {
  return `${Math.round(Number(n) || 0).toLocaleString('ar-EG')} ج.م`;
}

function fmtNum(n: number): string {
  return (Number(n) || 0).toLocaleString('ar-EG');
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

const RANGES = [
  { value: 7, label: 'آخر 7 أيام' },
  { value: 30, label: 'آخر 30 يوم' },
  { value: 90, label: 'آخر 90 يوم' },
];

export function AnalyticsTab() {
  const { settings } = useSettings();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.rpc('admin_get_analytics', { p_days: days });
      if (err) throw err;
      if (!res) {
        setError('تعذر تحميل التحليلات — تأكد من تشغيل هجرة admin_analytics في Supabase.');
        setData(null);
        return;
      }
      setData(res as AnalyticsPayload);
    } catch (e) {
      setError((e as Error)?.message || 'تعذر تحميل التحليلات.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, reload]);

  const maxSeries = Math.max(1, ...(data?.visits.last7 || []).map((d) => d.count), ...(data?.conversions.last7 || []).map((d) => d.count));
  const rate = data && data.visits.total > 0 ? ((data.conversions.total / data.visits.total) * 100) : 0;
  const noPurchase = (data?.searched || []).filter((s) => !s.purchased);
  const cancelRate = data && data.cancellation.total > 0 ? ((data.cancellation.cancelled / data.cancellation.total) * 100) : 0;

  const cards = [
    { label: 'إجمالي الزيارات', value: fmtNum(data?.visits.total || 0), sub: `اليوم: ${fmtNum(data?.visits.today || 0)}`, icon: <Eye />, color: settings.primary_color },
    { label: 'إجمالي التحويلات (طلبات)', value: fmtNum(data?.conversions.total || 0), sub: `اليوم: ${fmtNum(data?.conversions.today || 0)}`, icon: <ShoppingCart />, color: settings.secondary_color },
    { label: 'معدل التحويل', value: `${rate.toFixed(1)}%`, sub: 'تحويل / زيارات', icon: <TrendingUp />, color: '#0ea5e9' },
    { label: 'معدل الإلغاء', value: `${cancelRate.toFixed(1)}%`, sub: `${fmtNum(data?.cancellation.cancelled || 0)} من ${fmtNum(data?.cancellation.total || 0)} طلب`, icon: <XCircle />, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: settings.primary_color }} />
            لوحة التحليلات
          </h2>
          <p className="text-sm text-gray-500">الزيارات والتحويلات والأرباح والأداء لكل صيدلية والسجل الإداري الكامل</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setDays(r.value)}
                className={`px-3 py-2 text-xs font-bold transition-colors ${days === r.value ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setReload((c) => c + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            تحديث
          </button>
        </div>
      </div>

      {error && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
          <p className="text-sm font-black text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => setReload((c) => c + 1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 active:scale-95 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            إعادة المحاولة
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="w-12 h-12 rounded-xl mb-3 skeleton" />
              <div className="h-6 w-16 rounded-md skeleton mb-2" />
              <div className="h-3 w-24 rounded-md skeleton" />
            </div>
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${card.color}15` }}>
                  <span style={{ color: card.color }} className="[&>svg]:w-6 [&>svg]:h-6">{card.icon}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-[11px] text-gray-400 mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* الزيارات مقابل التحويلات */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-gray-900">الزيارات مقابل التحويلات (آخر 7 أيام)</h3>
              </div>
              <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: settings.primary_color }} /> زيارات</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: settings.secondary_color }} /> طلبات</span>
              </div>
              <div className="flex items-end gap-2 h-44">
                {[...Array(7)].map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  const dayKey = d.toLocaleDateString('en-CA').slice(5);
                  const visit = (data.visits.last7 || []).find((p) => p.day === dayKey)?.count || 0;
                  const conv = (data.conversions.last7 || []).find((p) => p.day === dayKey)?.count || 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-bold text-gray-600">{conv}</span>
                      <div className="w-full flex justify-center gap-1">
                        <div className="w-[38%] rounded-t-md transition-all" style={{ height: `${Math.max(4, (conv / maxSeries) * 118)}px`, backgroundColor: settings.secondary_color }} />
                        <div className="w-[38%] rounded-t-md transition-all" style={{ height: `${Math.max(4, (visit / maxSeries) * 118)}px`, backgroundColor: `${settings.primary_color}60` }} />
                      </div>
                      <span className="text-[10px] text-gray-400">{visit}</span>
                      <span className="text-[10px] text-gray-400">{d.toLocaleDateString('ar-EG', { weekday: 'short' })}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* أكثر المنتجات بحثاً بدون شراء */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <SearchCheck className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-gray-900">الأكثر بحثاً بدون شراء</h3>
              </div>
              {data.searched.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">لا توجد عمليات بحث مسجلة بعد</p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
                  {data.searched.map((s, i) => (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border ${s.purchased ? 'border-gray-100' : 'border-amber-200 bg-amber-50/60'}`}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0" style={{ backgroundColor: s.purchased ? `${settings.primary_color}15` : '#fef3c7', color: s.purchased ? settings.primary_color : '#b45309' }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{s.keyword}</p>
                        <p className="text-[11px] text-gray-500 truncate">{s.product_name || 'لا يوجد منتج مطابق'} • {fmtNum(s.search_count)} بحث</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${s.purchased ? 'bg-teal-50 text-teal-600' : 'bg-amber-100 text-amber-700'}`}>
                        {s.purchased ? 'تم شراؤه' : 'بدون شراء'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {noPurchase.length > 0 && (
                <p className="mt-3 text-[11px] font-bold text-amber-700">{fmtNum(noPurchase.length)} من الأكثر بحثاً لم تُشرّ منتجاتها بعد — ركّز العروض عليها</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* معدل إلغاء الطلبات */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-gray-900">معدل إلغاء الطلبات</h3>
              </div>
              <div className="flex items-center gap-6 mb-5">
                <div>
                  <p className="text-3xl font-black text-gray-900">{cancelRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">{fmtNum(data.cancellation.cancelled)} ملغي من أصل {fmtNum(data.cancellation.total)}</p>
                </div>
                <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${cancelRate}%`, backgroundColor: '#ef4444' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(data.cancellation.by_status || {}).map(([status, cnt]) => {
                  const meta = ORDER_STATUS_META[status as keyof typeof ORDER_STATUS_META];
                  return (
                    <div key={status} className={`rounded-xl border px-3 py-2.5 ${meta ? meta.className : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      <p className="text-lg font-black">{fmtNum(cnt)}</p>
                      <p className="text-[11px] font-bold">{meta ? meta.label : status}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* أداء الصيدليات */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Store className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-gray-900">أداء الصيدليات</h3>
              </div>
              {data.pharmacies.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">لا توجد طلبات في هذه الفترة</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pe-1">
                  {data.pharmacies.map((p, i) => {
                    const max = Math.max(1, ...data.pharmacies.map((x) => x.revenue));
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0" style={{ backgroundColor: settings.primary_color }}>
                          {p.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1"><PackageCheck className="w-3 h-3" /> {fmtNum(p.orders)} طلب</span>
                            {p.cancelled > 0 && <span className="flex items-center gap-1 text-red-500"><XCircle className="w-3 h-3" /> {fmtNum(p.cancelled)} ملغي</span>}
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 mt-1.5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(p.revenue / max) * 100}%`, backgroundColor: settings.secondary_color }} />
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-black text-gray-900">{fmtMoney(p.revenue)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* أرباح الكوبونات والاشتراكات والخصومات */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BadgePercent className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-gray-900">خصومات الولاء</h3>
              </div>
              <p className="text-2xl font-black text-gray-900">{fmtMoney(data.revenue.loyalty_total)}</p>
              <p className="text-xs text-gray-500 mt-1">{fmtNum(data.revenue.loyalty_count)} طلب استفاد من خصم نقاط</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-gray-900">الاشتراكات المزمنة</h3>
              </div>
              <p className="text-2xl font-black text-gray-900">{fmtMoney(data.revenue.sub_revenue)}</p>
              <p className="text-xs text-gray-500 mt-1">{fmtNum(data.revenue.sub_active)} اشتراك نشط • {fmtNum(data.revenue.sub_orders)} طلب تجديد</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Ticket className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-gray-900">الكوبونات</h3>
              </div>
              <p className="text-2xl font-black text-gray-900">{fmtMoney(data.revenue.coupon_discount)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {fmtNum(data.revenue.coupon_issued)} كوبون • {fmtNum(data.revenue.coupon_active)} نشط • {fmtNum(data.revenue.coupon_used)} استخدام
              </p>
            </div>
          </div>

          {/* السجل الإداري */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ScrollText className="w-5 h-5 text-gray-400" />
              <h3 className="font-bold text-gray-900">سجل التعديلات الإدارية</h3>
            </div>
            {data.audit.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">لا توجد تعديلات مسجلة بعد — أي تعديل من لوحة التحكم سيُسجَّل هنا تلقائياً</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pe-1">
                {data.audit.map((a) => (
                  <details key={a.id} className="group rounded-xl border border-gray-100 p-3">
                    <summary className="flex items-center gap-3 cursor-pointer list-none">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">
                          {a.summary}
                          <span className="text-gray-400 font-medium"> • {TABLE_LABELS[a.entity_table] || a.entity_table}</span>
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {a.admin_email || 'مشرف'} • {fmtTime(a.created_at)}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 group-open:bg-gray-900 group-open:text-white">
                        تفاصيل
                      </span>
                    </summary>
                    <pre className="mt-3 text-[11px] bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-700 max-h-48 overflow-y-auto" dir="ltr">
                      {JSON.stringify({ action: a.action, entity_id: a.entity_id, created_at: a.created_at }, null, 2)}
                    </pre>
                  </details>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}