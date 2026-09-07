import { supabase } from '@/lib/supabase';

export interface SubscriptionProduct {
  id: string;
  name: string;
  name_en?: string | null;
  price: number;
  unit?: string | null;
  image_url?: string | null;
  for_all_pharmacies?: boolean;
  discounts?: Array<{ discount_percentage: number; is_active: boolean }>;
}

export interface SubscriptionPharmacy {
  id: string;
  name: string;
}

export interface ChronicSubscription {
  id: string;
  customer_id: string;
  product_id: string;
  pharmacy_id: string | null;
  quantity: number;
  interval_days: number;
  next_run_at: string;
  active: boolean;
  payment_method: string;
  renewal_reminder_days?: number;
  last_reminder_for?: string | null;
  renewal_count?: number;
  paused_at?: string | null;
  address: string | null;
  note: string | null;
  created_at: string;
  product?: SubscriptionProduct | null;
  pharmacy?: SubscriptionPharmacy | null;
}

export function baseProductPrice(product: SubscriptionProduct): number {
  const activeDiscount = product.discounts?.find((d) => d.is_active);
  return activeDiscount
    ? product.price * (1 - activeDiscount.discount_percentage / 100)
    : product.price;
}

export async function fetchSubscriptions(customerId: string): Promise<ChronicSubscription[]> {
  const { data, error } = await supabase
    .from('chronic_subscriptions')
    .select('*, product:products(id, name, name_en, price, unit, image_url, for_all_pharmacies, discounts(*)), pharmacy:pharmacies(name)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as ChronicSubscription[];
}

export async function addSubscription(payload: {
  customerId: string;
  productId: string;
  pharmacyId?: string | null;
  quantity: number;
  address: string;
  note?: string;
  intervalDays?: number;
  paymentMethod?: 'cash_on_delivery' | 'vodafone_cash' | 'instapay';
  renewalReminderDays?: number;
}) {
  const { data, error } = await supabase
    .from('chronic_subscriptions')
    .insert({
      customer_id: payload.customerId,
      product_id: payload.productId,
      pharmacy_id: payload.pharmacyId ?? null,
      quantity: payload.quantity,
      address: payload.address.trim() || null,
      note: payload.note?.trim() || null,
      interval_days: payload.intervalDays ?? 30,
      next_run_at: new Date(Date.now() + (payload.intervalDays ?? 30) * 86400000).toISOString(),
      active: true,
      payment_method: payload.paymentMethod ?? 'cash_on_delivery',
      renewal_reminder_days: payload.renewalReminderDays ?? 3,
    })
    .select()
    .single();
  return { data: (data as ChronicSubscription | null) ?? null, error };
}

export async function updateSubscription(
  id: string,
  updates: Partial<Pick<ChronicSubscription, 'quantity' | 'address' | 'note' | 'active' | 'interval_days' | 'payment_method' | 'next_run_at' | 'renewal_reminder_days'>>,
) {
  const { data, error } = await supabase
    .from('chronic_subscriptions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data: (data as ChronicSubscription | null) ?? null, error };
}

export async function updateSubscriptionSchedule(id: string, nextRunAt: string, reminderDays: number, paymentMethod: string) {
  const { data, error } = await supabase.rpc('update_subscription_schedule', {
    p_subscription_id: id,
    p_next_run_at: nextRunAt,
    p_reminder_days: reminderDays,
    p_payment_method: paymentMethod,
  });
  return { data: (data as ChronicSubscription | null) ?? null, error };
}

export async function cancelSubscription(id: string): Promise<{ error: unknown | null }> {
  const { error } = await supabase.from('chronic_subscriptions').delete().eq('id', id);
  return { error };
}