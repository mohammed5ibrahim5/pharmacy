import { supabase } from '@/lib/supabase';

export interface PaymentIntentResponse {
  token: string;
  iframeId: string;
  paymobOrderId: string;
  hostedUrl: string;
}

export interface PaymentIntentRequest {
  amount: number;
  phone: string;
  email: string;
  firstName: string;
  lastName?: string;
  orderGroupId: string;
  integration?: 'card' | 'wallet';
}

/**
 * Creates a Paymob payment intent via the Vercel serverless function.
 * The function keeps the merchant keys server-side (env vars).
 */
export async function createPaymentIntent(req: PaymentIntentRequest): Promise<PaymentIntentResponse> {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const res = await fetch(`${base}/api/payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const body = (await res.json().catch(() => null)) as
    | { ok: boolean; error?: string; data?: PaymentIntentResponse }
    | null;
  if (!res.ok || !body || !body.ok || !body.data) {
    throw new Error(body?.error || 'PAYMENT_NOT_CONFIGURED');
  }
  return body.data;
}

export async function findOrderGroupStatus(groupId: string, customerId: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) return null;
  const { data } = await supabase
    .from('order_groups')
    .select('payment_status, status')
    .eq('id', groupId)
    .eq('customer_id', customerId)
    .maybeSingle();
  return (data as { payment_status?: string } | null)?.payment_status ?? null;
}