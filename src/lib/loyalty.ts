import { supabase } from '@/lib/supabase';
import { insertNotification } from '@/lib/notifications';
import type { LoyaltyTransaction, StockAlert, MedicationReminder } from '@/types';

export async function fetchLoyaltyBalance(customerId: string): Promise<number> {
  const { data } = await supabase
    .from('customers')
    .select('loyalty_points')
    .eq('id', customerId)
    .maybeSingle();
  return Number((data as { loyalty_points?: number } | null)?.loyalty_points || 0);
}

export async function fetchLoyaltyHistory(customerId: string): Promise<LoyaltyTransaction[]> {
  const { data } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data || []) as LoyaltyTransaction[];
}

export async function awardLoyaltyPoints(customerId: string, points: number, reason: string) {
  await supabase
    .from('customers')
    .update({ loyalty_points: points })
    .eq('id', customerId);
  await supabase.from('loyalty_transactions').insert({
    customer_id: customerId,
    points,
    reason,
  });
}

export async function addStockAlert(customerId: string, productId: string) {
  const { error } = await supabase.from('stock_alerts').insert({
    customer_id: customerId,
    product_id: productId,
  });
  if (error) throw error;
}

export async function removeStockAlert(customerId: string, productId: string) {
  await supabase
    .from('stock_alerts')
    .delete()
    .eq('customer_id', customerId)
    .eq('product_id', productId);
}

export async function fetchStockAlerts(customerId: string): Promise<StockAlert[]> {
  const { data } = await supabase
    .from('stock_alerts')
    .select('*, product:products(*)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  return (data || []) as StockAlert[];
}

export async function notifyStockAvailable(productId: string) {
  const { data: alerts } = await supabase
    .from('stock_alerts')
    .select('*, customer:customers(*)')
    .eq('product_id', productId);
  const { data: product } = await supabase.from('products').select('name').eq('id', productId).maybeSingle();
  if (!alerts || alerts.length === 0) return;
  for (const alert of alerts as (StockAlert & { customer: { id: string } })[]) {
    await insertNotification({
      customerId: alert.customer_id,
      type: 'stock',
      title: 'الدواء أصبح متوفراً الآن',
      body: `لقد توفر ${(product as { name: string } | null)?.name || 'المنتج الذي طلبته'} — اطلبه الآن قبل نفاد الكمية.`,
    });
  }
  await supabase.from('stock_alerts').delete().eq('product_id', productId);
}

const REMINDERS_KEY = 'pharmacy_reminders';

export function loadLocalReminders(): MedicationReminder[] {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    return raw ? (JSON.parse(raw) as MedicationReminder[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalReminders(list: MedicationReminder[]) {
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}
