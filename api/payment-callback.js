// =====================================================
// Paymob transaction callback (webhook) — Vercel Serverless
// =====================================================
// Configure this URL as the transaction response endpoint in
// your Paymob dashboard. On success it marks the order paid.
// Optional env: PAYMOB_HMAC_SECRET to verify webhooks.
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// =====================================================

import { createHmac, timingSafeEqual } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function verifyHmac(obj, header) {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret || !header) return true; // not configured — accept (dev mode)
  const data = { ...obj };
  delete data.data;
  const sorted = Object.keys(data)
    .sort()
    .map((k) => String(data[k]))
    .join('')
    .toLowerCase();
  const expected = createHmac('sha256', secret).update(sorted).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(header.toLowerCase()), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function rest(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) return { error: await res.text() };
  const text = await res.text();
  return { data: text ? JSON.parse(text) : null };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }
  res.status(200).json({ received: true }); // ack early so Paymob does not retry

  if (!SUPABASE_URL || !SERVICE_KEY) return;

  const body = req.body || {};
  const obj = body.obj || body;
  if (!verifyHmac(obj, req.headers['hmac'])) {
    console.error('[payment-callback] HMAC verification failed');
    return;
  }

  const success = obj.success === true;
  const paymobOrderId = String((obj.order && obj.order.id) || '');
  if (!paymobOrderId) {
    console.error('[payment-callback] missing order.id');
    return;
  }

  try {
    // Find our order group by the Paymob order id
    const sel = await rest('GET', `/rest/v1/order_groups?select=id,customer_id&online_payment_ref=eq.${encodeURIComponent(paymobOrderId)}`);
    const group = sel.data && sel.data[0];
    if (!group || !group.id) {
      console.error('[payment-callback] no matching order group for', paymobOrderId);
      return;
    }

    const patch = success
      ? { payment_status: 'paid', status: 'confirmed', updated_at: new Date().toISOString() }
      : { payment_status: 'failed', updated_at: new Date().toISOString() };
    await rest('PATCH', `/rest/v1/order_groups?id=eq.${group.id}`, patch);
    await rest('PATCH', `/rest/v1/orders?order_group_id=eq.${group.id}`, patch);

    if (success && group.customer_id) {
      await rest('POST', '/rest/v1/notifications', {
        customer_id: group.customer_id,
        type: 'order',
        title: 'تم تأكيد دفع طلبك أونلاين',
        body: 'تم استلام دفعتك بنجاح، طلبك الآن قيد المراجعة.',
        read: false,
      });
    }
  } catch (err) {
    console.error('[payment-callback] error:', err);
  }
}