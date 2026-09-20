import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package, Store, ShoppingCart, Layers, MapPin, Info, Wallet, Truck, Send,
  Printer, Image as ImageIcon, BellRing, Timer, Search as SearchIcon, Download, Coins,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { translateError } from '@/lib/errorMessages';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import {
  ORDER_STATUSES, ORDER_STATUS_META,
} from '@/lib/orders';
import { PrivateLink } from '@/components/PrivateImage';
import { InvoiceModal } from '@/components/InvoiceModal';
import { insertNotification } from '@/lib/notifications';
import { awardLoyaltyPoints } from '@/lib/loyalty';
import type { Pharmacy, Product } from '@/types';
import { soundAlert } from '@/lib/soundAlert';
import { useToast } from './shared';

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
  acceptance_deadline?: string | null;
  accepted_at?: string | null;
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
  platform_commission: number;
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
  platform_commission: number;
}

export function OrdersTab({ pharmacyId }: { pharmacyId?: string }) {
  const { settings, loyaltyConfig, commissionConfig } = useSettings();
  const { toast } = useToast();
  const [list, setList] = useState<OrderRecord[]>([]);
  const [groups, setGroups] = useState<OrderGroupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | (typeof ORDER_STATUSES)[number]>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [invoiceView, setInvoiceView] = useState<GroupView | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
    if (error) toast(translateError(error.message).ar);
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

  useEffect(() => {
    if (!pharmacyId) return;
    const channel = supabase.channel(`pharmacy-orders-${pharmacyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `pharmacy_id=eq.${pharmacyId}` }, () => {
        setNewOrderAlert(true);
        soundAlert.playNewOrderChime();
        void fetchOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `pharmacy_id=eq.${pharmacyId}` }, () => void fetchOrders())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [pharmacyId, fetchOrders]);

  const acceptOrder = async (orderId: string, accepted: boolean) => {
    const { error } = await supabase.rpc('accept_pharmacy_order', { p_order_id: orderId, p_accept: accepted });
    if (error) toast(translateError(error.message).ar);
    else { toast(accepted ? 'تم قبول الطلب' : 'تم رفض الطلب'); await fetchOrders(); }
  };

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
        platform_commission: Number(grp?.platform_commission || 0),
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
        platform_commission: 0,
      });
    });
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [list, groups]);

  const counts = useCallback(
    (status: string) => views.filter((v) => v.status === status).length,
    [views]
  );

  const updateOrderStatus = async (view: GroupView, status: string) => {
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
      toast(translateError(errors[0]).ar);
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
        if ((status === 'confirmed' || status === 'delivered') && loyaltyConfig?.enabled) {
          try {
            const pointsPerOrder = loyaltyConfig?.pointsPerOrder || 0;
            const pointsPerPound = loyaltyConfig?.pointsPerPound || 0;
            const groupTotal = view.group ? Number(view.group.total_price) : 0;
            const earnBase = pointsPerOrder;
            const earnSpend = pointsPerPound > 0 ? Math.floor(groupTotal / pointsPerPound) : 0;
            const earnedPoints = earnBase + earnSpend;
            
            if (earnedPoints > 0) {
              await awardLoyaltyPoints(first.customer_id, earnedPoints, `مكافأة طلب ${isScopedGroup ? 'موحّد' : ''} من ${groups.length} صيدلية`);
              toast(`تم منح ${earnedPoints} نقطة ولاء للعميل`);
            }
          } catch (loyaltyErr) {
            console.error('Failed to award loyalty points:', loyaltyErr);
          }
        }
      }
      toast('تم تحديث حالة الطلب بنجاح');
    }
  };

  const filtered = useMemo(() => {
    let result = filter === 'all' ? views : views.filter((v) => v.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((v) => {
        const customerName = v.orders[0]?.customer?.full_name?.toLowerCase() || '';
        const customerPhone = v.orders[0]?.customer?.phone || '';
        const productId = v.key.toLowerCase();
        const address = v.address?.toLowerCase() || '';
        return customerName.includes(q) || customerPhone.includes(q) || productId.includes(q) || address.includes(q);
      });
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((v) => new Date(v.created_at).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59').getTime();
      result = result.filter((v) => new Date(v.created_at).getTime() <= to);
    }
    return result;
  }, [views, filter, search, dateFrom, dateTo]);

  const exportCSV = useCallback(() => {
    const headers = ['التاريخ', 'الحالة', 'العميل', 'الهاتف', 'المنتج', 'الصيدلية', 'الكمية', 'السعر', 'عمولة المنصة', 'العنوان', 'ملاحظات'];
    const rows = filtered.map((v) => {
      const o = v.orders[0];
      return [
        new Date(v.created_at).toLocaleDateString('ar-EG'),
        v.status,
        o.customer?.full_name || '',
        o.customer?.phone || '',
        v.orders.map((x) => x.product?.name || '').join(' + '),
        v.orders.map((x) => x.pharmacy?.name || '').join(' + '),
        v.orders.reduce((s, x) => s + x.quantity, 0),
        Number(v.total).toFixed(2),
        Number(v.platform_commission).toFixed(2),
        v.address || '',
        v.note || '',
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('تم تصدير البيانات بنجاح');
  }, [filtered, toast]);

  return (
    <div className="space-y-5">
      {newOrderAlert && <button onClick={() => setNewOrderAlert(false)} className="fixed top-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-xs font-black text-white shadow-xl"><BellRing className="h-4 w-4" />طلب جديد وصل للصيدلية — اضغط للإخفاء</button>}

      {/* Search + Date filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهاتف أو العنوان..."
            className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <span className="text-xs text-gray-400 font-bold">←</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          {(search || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
              className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-colors"
            >
              مسح الفلتر
            </button>
          )}
          {filtered.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold hover:bg-teal-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              تصدير CSV
            </button>
          )}
        </div>
      </div>

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
            const acceptanceDeadline = order.acceptance_deadline || new Date(new Date(order.created_at).getTime() + 15 * 60 * 1000).toISOString();
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

                {/* Products */}
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
                    {view.platform_commission > 0 && (
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-600">
                        <span className="flex items-center gap-1">
                          <Coins className="w-3 h-3" /> عمولة المنصة ({commissionConfig.percentage}%)
                        </span>
                        <span>{view.platform_commission.toFixed(2)} ج.م</span>
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
                {view.status === 'pending' && pharmacyId && (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-black text-amber-800">
                    <span className="flex items-center gap-1.5"><Timer className="h-4 w-4" />مهلة قبول الطلب حتى {new Date(acceptanceDeadline).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="flex gap-2"><button onClick={() => acceptOrder(order.id, true)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white">قبول</button><button onClick={() => acceptOrder(order.id, false)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-white">رفض</button></div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[10px] font-black text-gray-400 ml-1">تحديث الحالة:</span>
                  {ORDER_STATUSES.map((s) => {
                    const sm = ORDER_STATUS_META[s];
                    const active = view.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => updateOrderStatus(view, s)}
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
