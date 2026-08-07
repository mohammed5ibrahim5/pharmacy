import { Printer, X, MapPin, Phone, Wallet } from 'lucide-react';
import type { SiteSettings } from '@/types';
import { ORDER_STATUS_META } from '@/lib/orders';

interface InvoiceOrderItem {
  id: string;
  quantity: number;
  total_price: number;
  product?: { name?: string; image_url?: string | null } | null;
  pharmacy?: { name?: string } | null;
}

export interface InvoiceOrderData {
  id: string;
  status: string;
  created_at: string;
  customer: { full_name?: string | null; phone?: string | null } | null;
  address: string | null;
  note: string | null;
  payment_method: string | null;
  payment_number: string | null;
  delivery_fee: number;
  total: number;
  orders: InvoiceOrderItem[];
}

interface InvoiceModalProps {
  open: boolean;
  order: InvoiceOrderData;
  settings: SiteSettings;
  onClose: () => void;
}

function paymentLabel(method: string | null): string {
  if (method === 'instapay') return 'انستا باي';
  if (method === 'vodafone_cash') return 'فودافون كاش';
  return 'لم يُحدد';
}

export function InvoiceModal({ open, order, settings, onClose }: InvoiceModalProps) {
  if (!open) return null;

  const subtotal = order.orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const total = Number(order.total ?? subtotal + deliveryFee);
  const invoiceNo = `#${order.id.slice(0, 8).toUpperCase()}`;
  const dateLabel = new Date(order.created_at).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeLabel = new Date(order.created_at).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const statusMeta = ORDER_STATUS_META[(order.status as keyof typeof ORDER_STATUS_META)] || ORDER_STATUS_META.pending;

  const invoiceBody = (
    <div className="bg-white">
      {/* Top accent band */}
      <div className="h-1.5 w-full rounded-full mb-6" style={{ backgroundColor: settings.primary_color }} />

      {/* Brand + invoice title */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b-2 border-gray-100 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0 shadow-md"
            style={{ backgroundColor: settings.primary_color }}
          >
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              (settings.site_name || 'ص').charAt(0)
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-gray-900 truncate">{settings.site_name || 'صيدليتي'}</h1>
            <p className="text-[11px] text-gray-500 truncate">{settings.site_tagline || ''}</p>
            {settings.contact_phone && (
              <p className="text-[11px] font-bold text-gray-600 flex items-center gap-1 mt-1" dir="ltr">
                <Phone className="w-3 h-3 text-gray-400 shrink-0" style={{ color: settings.primary_color }} />
                {settings.contact_phone}
              </p>
            )}
          </div>
        </div>
        <div className="text-left shrink-0">
          <p className="text-[10px] font-black tracking-widest text-gray-400 mb-0.5">INVOICE</p>
          <h2 className="text-2xl font-black text-gray-900">فاتورة</h2>
          <p className="text-[11px] font-black text-gray-600 mt-1" dir="ltr">{invoiceNo}</p>
        </div>
      </div>

      {/* Customer + details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 mb-2">البيان لصالح</p>
          <p className="text-sm font-black text-gray-900 mb-1">{order.customer?.full_name || 'عميل'}</p>
          {order.customer?.phone && (
            <p className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5" dir="ltr">
              <Phone className="w-3 h-3 text-gray-400 shrink-0" />
              {order.customer.phone}
            </p>
          )}
          <p className="text-[11px] font-bold text-gray-600 flex items-start gap-1.5 mt-1">
            <MapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
            <span>{order.address || 'عنوان غير محدد'}</span>
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-2.5">
            <span className="text-[11px] font-bold text-gray-500">حالة الطلب</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${statusMeta.className}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
              {statusMeta.label}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-2.5">
            <span className="text-[11px] font-bold text-gray-500">طريقة الدفع</span>
            <span className="text-[11px] font-black text-gray-800 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" style={{ color: settings.primary_color }} />
              {paymentLabel(order.payment_method)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-2.5">
            <span className="text-[11px] font-bold text-gray-500">التاريخ والوقت</span>
            <span className="text-[11px] font-black text-gray-800">
              {dateLabel} — {timeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 mb-5">
        <table className="w-full text-right">
          <thead>
            <tr className="text-[10px] font-black text-white" style={{ backgroundColor: settings.primary_color }}>
              <th className="py-2.5 px-3 font-black">م</th>
              <th className="py-2.5 px-3 font-black">المنتج</th>
              <th className="py-2.5 px-3 font-black hidden sm:table-cell">الصيدلية</th>
              <th className="py-2.5 px-3 font-black">الكمية</th>
              <th className="py-2.5 px-3 font-black">سعر الوحدة</th>
              <th className="py-2.5 px-3 font-black">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {order.orders.map((o, i) => {
              const unitPrice = Number(o.total_price / o.quantity);
              return (
                <tr key={o.id} className={`text-[11px] border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                  <td className="py-2.5 px-3 text-gray-400 font-bold">{i + 1}</td>
                  <td className="py-2.5 px-3 font-black text-gray-900">{o.product?.name || 'منتج'}</td>
                  <td className="py-2.5 px-3 font-bold text-gray-500 hidden sm:table-cell">{o.pharmacy?.name || 'صيدلية'}</td>
                  <td className="py-2.5 px-3 font-bold text-gray-600">{o.quantity}</td>
                  <td className="py-2.5 px-3 font-bold text-gray-600">{unitPrice.toFixed(2)}</td>
                  <td className="py-2.5 px-3 font-black text-gray-900">{Number(o.total_price).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-full sm:w-72 space-y-2">
          <div className="flex items-center justify-between text-[12px] font-bold text-gray-500 px-4">
            <span>المجموع الفرعي</span>
            <span className="text-gray-800">{subtotal.toFixed(2)} ج.م</span>
          </div>
          <div className="flex items-center justify-between text-[12px] font-bold text-gray-500 px-4">
            <span>رسوم التوصيل</span>
            <span className="text-gray-800">{deliveryFee.toFixed(2)} ج.م</span>
          </div>
          <div
            className="flex items-center justify-between rounded-2xl px-4 py-3 text-white shadow-lg"
            style={{ backgroundColor: settings.primary_color }}
          >
            <span className="text-sm font-black">الإجمالي المستحق</span>
            <span className="text-lg font-black">{total.toFixed(2)} ج.م</span>
          </div>
          {order.payment_number && (
            <p className="text-[11px] font-black text-gray-600 text-left px-1" dir="ltr">
              رقم العملية: {order.payment_number}
            </p>
          )}
        </div>
      </div>

      {order.note && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 mb-5">
          <p className="text-[11px] font-bold text-amber-700">
            <span className="font-black">ملاحظات الطلب: </span>
            {order.note}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 border-dashed border-gray-200 pt-4 mt-2">
        <div className="text-center">
          <p className="text-sm font-black text-gray-800 mb-1">شكراً لثقتكم في {settings.site_name || 'صيدليتي'} 💚</p>
          <p className="text-[11px] font-bold text-gray-500">{settings.footer_text || 'جميع الحقوق محفوظة'}</p>
          <p className="text-[10px] font-bold text-gray-400 mt-1">
            {[settings.contact_phone, settings.contact_email, settings.contact_address].filter(Boolean).join(' • ')}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl">
        {/* Modal header */}
        <div
          className="px-5 py-4 text-white flex items-center justify-between shrink-0"
          style={{ backgroundColor: settings.primary_color }}
        >
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            <h2 className="font-black">فاتورة العميل</h2>
            <span className="text-[10px] font-bold bg-white/20 rounded-full px-2.5 py-0.5" dir="ltr">{invoiceNo}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="invoice-no-print flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-xs font-black hover:bg-gray-100 active:scale-95 transition-all shadow-md"
              style={{ color: settings.primary_color }}
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة الفاتورة
            </button>
            <button
              onClick={onClose}
              className="invoice-no-print w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice body */}
        <div className="invoice-area flex-1 overflow-y-auto bg-white px-5 py-6">{invoiceBody}</div>
      </div>
    </div>
  );
}
