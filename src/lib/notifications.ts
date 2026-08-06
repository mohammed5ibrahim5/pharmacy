import { supabase } from '@/lib/supabase';

export interface AppNotification {
  id: string;
  customer_id: string | null;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

export async function fetchNotifications(customerId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) return [];
  return (data || []) as AppNotification[];
}

export async function markNotificationsRead(customerId: string) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('customer_id', customerId)
    .eq('read', false);
}

export async function insertNotification(payload: {
  customerId: string;
  type: string;
  title: string;
  body: string;
}) {
  const { error } = await supabase.from('notifications').insert({
    customer_id: payload.customerId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    read: false,
  });
  if (error) throw error;
}
