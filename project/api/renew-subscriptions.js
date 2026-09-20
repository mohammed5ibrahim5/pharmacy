// =====================================================
// Chronic subscriptions renewal (Vercel Cron)
// =====================================================
// Vercel cron: 0 2 * * *  (يومياً الساعة 2 صباحاً)
// يستدعي RPC renew_chronic_subscriptions بالـ service role key.
// RPC نفسه قادر على إعادة التشغيل بأمان (يعالج الطلبات المستحقة فقط).
// Required env vars on Vercel:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   VERCEL_CRON_SECRET (اختياري — إن وُجد يتم التحقق من العنوان)
// =====================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const cronSecret = process.env.VERCEL_CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(503).json({ ok: false, error: 'NOT_CONFIGURED' });
    return;
  }

  try {
    const callRpc = async (name) => fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: '{}',
    });

    await callRpc('send_subscription_reminders');
    await callRpc('notify_subscription_low_stock');
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/renew_chronic_subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: '{}',
    });

    const body = await rpcRes.json();
    if (!rpcRes.ok) {
      res.status(502).json({ ok: false, error: 'RENEW_FAILED', detail: body });
      return;
    }

    res.status(200).json({ ok: true, data: body });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: 'RENEW_UNAVAILABLE',
      detail: String((err && err.message) || err),
    });
  }
}