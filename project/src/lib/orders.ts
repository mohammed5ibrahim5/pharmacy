import { supabase } from '@/lib/supabase';

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
];

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; className: string; dot: string }
> = {
  pending: { label: 'قيد المراجعة', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  confirmed: { label: 'تم تأكيد الدفع', className: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  shipped: { label: 'تم الشحن - في الطريق', className: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  delivered: { label: 'تم التسليم', className: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
  cancelled: { label: 'ملغي', className: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500' },
};

export const PAYMENT_METHODS = [
  { id: 'vodafone_cash', label: 'فودافون كاش', description: 'تحويل عبر محفظة فودافون كاش' },
  { id: 'instapay', label: 'انستا باي', description: 'تحويل عبر تطبيق انستا باي' },
  { id: 'online', label: 'دفع أونلاين (كارت/محفظة)', description: 'بوابة دفع آمنة — فيزا/ماستركارد/محفظة' },
  { id: 'cash_on_delivery', label: 'الدفع عند الاستلام', description: 'ادفع نقداً عند استلام طلبك' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['id'];

export interface PaymentConfig {
  vodafoneCash: string;
  instapay: string;
  deliveryFee: string;
  freeDeliveryThreshold: string;
  showCashOnDelivery: boolean;
  showOnlinePayment: boolean;
  cashOnDeliveryFee: string;
  shippingNote: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface CommissionConfig {
  enabled: boolean;
  percentage: string;
  minCommission: string;
  maxCommission: string;
  subscriptionPlans: SubscriptionPlan[];
}

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  vodafoneCash: '',
  instapay: '',
  deliveryFee: '25',
  freeDeliveryThreshold: '300',
  showCashOnDelivery: true,
  showOnlinePayment: true,
  cashOnDeliveryFee: '10',
  shippingNote: 'التوصيل داخل المعادي خلال 30 دقيقة، وفي باقي المناطق خلال 24 ساعة',
};

export const DEFAULT_COMMISSION_CONFIG: CommissionConfig = {
  enabled: false,
  percentage: '5',
  minCommission: '2',
  maxCommission: '50',
  subscriptionPlans: [
    { id: 'basic', name: 'الأساسية', price: 0, description: 'عمولة 5% فقط' },
    { id: 'pro', name: 'الاحترافية', price: 500, description: '500 ج.م شهرياً + عمولة 5%' },
    { id: 'enterprise', name: 'المؤسسات', price: 1500, description: '1500 ج.م شهرياً + عمولة 5% + دعم مخصص' },
  ],
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  vodafone_cash: 'فودافون كاش',
  instapay: 'انستا باي',
  online: 'دفع أونلاين',
  cash_on_delivery: 'الدفع عند الاستلام',
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/png';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function uploadPaymentScreenshot(dataUrl: string, customerId: string): Promise<string> {
  const path = `${customerId}/pay_${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
  const blob = dataUrlToBlob(dataUrl);
  
  // للمستخدمين المحليين (local-demo) — خزن كـ data URL محلياً
  if (customerId.startsWith('local-') || !supabase.auth.getSession) {
    return dataUrl;
  }
  
  const { error } = await supabase.storage
    .from('payments')
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) {
    // لو فشل الرفع (مثلاً المستخدم محلي)، رجّع الـ data URL كحل احتياطي
    if (error.message?.includes('auth') || error.message?.includes('row-level') || error.message?.includes('policy')) {
      return dataUrl;
    }
    throw error;
  }
  const { data } = supabase.storage.from('payments').getPublicUrl(path);
  return data.publicUrl;
}
