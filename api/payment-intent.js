// =====================================================
// Paymob payment intent (Vercel Serverless Function)
// =====================================================
// Required env vars on Vercel:
//   PAYMOB_API_KEY
//   PAYMOB_INTEGRATION_CARD   (id of the card/acceptance integration)
//   PAYMOB_IFRAME_CARD        (id of the iframe for cards)
//   PAYMOB_INTEGRATION_WALLET (id of the wallet integration — optional)
//   PAYMOB_IFRAME_WALLET      (id of the wallet iframe — optional)
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY (used to persist the payment ref securely)
// =====================================================

const PAYMOB_BASE = 'https://accept.paymob.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const apiKey = process.env.PAYMOB_API_KEY;
  const cardIntegration = process.env.PAYMOB_INTEGRATION_CARD;
  const cardIframe = process.env.PAYMOB_IFRAME_CARD;
  if (!apiKey || !cardIntegration || !cardIframe) {
    res.status(503).json({ ok: false, error: 'PAYMENT_NOT_CONFIGURED' });
    return;
  }

  const { amount, phone, email, firstName, lastName, orderGroupId, integration } = req.body || {};
  if (!amount || amount <= 0 || !orderGroupId || !(phone || email)) {
    res.status(400).json({ ok: false, error: 'INVALID_PAYMENT_REQUEST' });
    return;
  }

  const wallet = integration === 'wallet';
  const integrationId = wallet ? process.env.PAYMOB_INTEGRATION_WALLET : cardIntegration;
  const iframeId = wallet ? process.env.PAYMOB_IFRAME_WALLET : cardIframe;
  if (wallet && (!integrationId || !iframeId)) {
    res.status(503).json({ ok: false, error: 'WALLET_NOT_CONFIGURED' });
    return;
  }

  const amountCents = Math.round(amount * 100);

  try {
    // 1) Auth token
    const auth = await (
      await fetch(`${PAYMOB_BASE}/api/auth/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      })
    ).json();
    if (!auth.token) throw new Error('PAYMOB_AUTH_FAILED');

    // 2) Create merchant order
    const order = await (
      await fetch(`${PAYMOB_BASE}/api/ecommerce/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: auth.token,
          delivery_needed: false,
          amount_cents: amountCents,
          currency: 'EGP',
          merchant_order_id: String(orderGroupId),
          items: [
            {
              name: 'Pharmacy Order',
              amount_cents: amountCents,
              quantity: 1,
              description: String(orderGroupId),
            },
          ],
        }),
      })
    ).json();
    if (!order.id) throw new Error('PAYMOB_ORDER_FAILED');
    const paymobOrderId = String(order.id);

    // 3) Payment key
    const keyRes = await (
      await fetch(`${PAYMOB_BASE}/api/acceptance/payment_keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: auth.token,
          amount_cents: amountCents,
          expiration: 3600,
          order_id: paymobOrderId,
          billing_data: {
            apartment: 'N/A',
            floor: 'N/A',
            building: 'N/A',
            street: 'N/A',
            city: 'N/A',
            state: 'N/A',
            country: 'EG',
            first_name: firstName || 'Customer',
            last_name: lastName || 'Online',
            email: email || 'noemail@example.com',
            phone_number: phone || '01000000000',
          },
          currency: 'EGP',
          integration_id: integrationId,
          lock_order_when_paid: true,
        }),
      })
    ).json();
    if (!keyRes.token) throw new Error('PAYMOB_KEY_FAILED');

    // 4) Persist the Paymob order id as the offline reference (server-side, RLS-proof)
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      await fetch(`${supabaseUrl}/rest/v1/order_groups?id=eq.${encodeURIComponent(orderGroupId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ online_payment_ref: paymobOrderId }),
      });
    }

    res.status(200).json({
      ok: true,
      data: {
        token: keyRes.token,
        iframeId,
        paymobOrderId,
        hostedUrl: `${PAYMOB_BASE}/api/acceptance/iframes/${iframeId}?token=${keyRes.token}`,
      },
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: 'PAYMENT_GATEWAY_UNAVAILABLE',
      detail: String((err && err.message) || err),
    });
  }
}