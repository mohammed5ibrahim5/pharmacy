-- ============================================================
-- 20260906 — اشتراكات الأدوية المزمنة (Chronic Subscriptions)
--   اشتراك شهري يتجدد تلقائياً: السكري/الضغط والأدوية الدورية.
--   - جدول chronic_subscriptions (عميل يشترك في منتج بكمية وعنوان).
--   - RLS على طراز *_own (العميل يرى/ينشئ/يعدّل/يلغي اشتراكاته).
--   - RPC renew_chronic_subscriptions(): يستدعيه Vercel Cron بالـ
--     service role key — ينشئ order_groups + orders لكل اشتراك مستحق
--     ويخصم المخزون ويضيف إشعاراً ويؤجّل الموعد التالي.
--   - خصم الاشتراك يُقرأ من site_settings.features_json.subscriptionConfig
--     (افتراضياً 5%).
-- ============================================================

-- ------------------------------------------------------------
-- جدول الاشتراكات
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chronic_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  interval_days integer NOT NULL DEFAULT 30 CHECK (interval_days > 0),
  next_run_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  payment_method text NOT NULL DEFAULT 'cash_on_delivery',
  address text,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chronic_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chronic_subscriptions_select_own" ON public.chronic_subscriptions;
CREATE POLICY "chronic_subscriptions_select_own" ON public.chronic_subscriptions FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

DROP POLICY IF EXISTS "chronic_subscriptions_insert_own" ON public.chronic_subscriptions;
CREATE POLICY "chronic_subscriptions_insert_own" ON public.chronic_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "chronic_subscriptions_update_own" ON public.chronic_subscriptions;
CREATE POLICY "chronic_subscriptions_update_own" ON public.chronic_subscriptions FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin())
  WITH CHECK (customer_id = auth.uid() OR public.is_site_admin());

DROP POLICY IF EXISTS "chronic_subscriptions_delete_own" ON public.chronic_subscriptions;
CREATE POLICY "chronic_subscriptions_delete_own" ON public.chronic_subscriptions FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

-- ============================================================
-- RPC التجديد التلقائي (يستدعيه الكرون بالـ service role key)
-- لا يعتمد على auth.uid() — يُنشئ الطلبات نيابة عن العملاء.
-- ============================================================
CREATE OR REPLACE FUNCTION public.renew_chronic_subscriptions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_fj jsonb;
  v_settings record;

  v_free_threshold numeric;
  v_delivery_fee numeric;
  v_cod_fee numeric;
  v_sub_discount numeric := 5;

  v_sub record;
  v_product record;
  v_discount numeric;
  v_final numeric;
  v_subtotal numeric;
  v_deliv numeric;
  v_cod numeric;
  v_total numeric;

  v_order_group_id uuid;
  v_renewed int := 0;
  v_paused int := 0;
  v_now timestamptz := now();
begin
  -- قراءة الإعدادات (دفع + خصم الاشتراك)
  select features_json into v_settings from public.site_settings order by id limit 1;
  v_fj := coalesce(nullif(v_settings.features_json, ''), '{}')::jsonb;

  v_free_threshold := coalesce(nullif(nullif(trim(coalesce(v_fj->'paymentConfig'->>'freeDeliveryThreshold','')),''),'null')::numeric, 300);
  v_delivery_fee   := coalesce(nullif(nullif(trim(coalesce(v_fj->'paymentConfig'->>'deliveryFee','')),''),'null')::numeric, 25);
  v_cod_fee        := coalesce(nullif(nullif(trim(coalesce(v_fj->'paymentConfig'->>'cashOnDeliveryFee','')),''),'null')::numeric, 10);
  v_sub_discount   := coalesce((v_fj->'subscriptionConfig'->>'discountPercent')::numeric, 5);
  if (v_fj->'subscriptionConfig'->>'enabled')::boolean = false then
    return jsonb_build_object('enabled', false, 'renewed', 0, 'paused', 0);
  end if;

  for v_sub in
    select s.*
      from public.chronic_subscriptions s
     where s.active = true
       and s.next_run_at <= v_now
     order by s.created_at
  loop
    -- بيانات المنتج
    select p.price, p.stock_quantity, p.name, p.pharmacy_id,
           coalesce(p.for_all_pharmacies, false), coalesce(p.is_available, false)
      into v_product.price, v_product.stock_quantity, v_product.name,
           v_product.pharmacy_id, v_product.for_all, v_product.available
      from public.products p
     where p.id = v_sub.product_id;

    -- إيقاف مؤقت: المنتج غير موجود / غير متوفر / الكمية لا تكفي
    if v_product.price is null
       or not v_product.available
       or v_product.stock_quantity is null
       or v_product.stock_quantity < v_sub.quantity then
      update public.chronic_subscriptions
         set active = false, updated_at = v_now
       where id = v_sub.id;
      insert into public.notifications (customer_id, type, title, body, read)
      values (v_sub.customer_id, 'subscription',
              'تم إيقاف اشتراكك: ' || coalesce(v_product.name, ''),
              'المنتج غير متوفر حالياً في الكمية المطلوبة. سيظل اشتراكك محفوظاً ويمكنك إعادة تفعيله لاحقاً.',
              false);
      v_paused := v_paused + 1;
      continue;
    end if;

    -- إيقاف مؤقت: لا يوجد عنوان للاستلام
    if coalesce(trim(nullif(v_sub.address, '')), '') = '' then
      update public.chronic_subscriptions
         set active = false, updated_at = v_now
       where id = v_sub.id;
      insert into public.notifications (customer_id, type, title, body, read)
      values (v_sub.customer_id, 'subscription',
              'تم إيقاف اشتراكك: ' || v_product.name,
              'لا يمكن تجديد الطلب لأنك لم تحدد عنواناً للاستلام. أضف عنواناً ثم أعد تفعيل الاشتراك.',
              false);
      v_paused := v_paused + 1;
      continue;
    end if;

    -- السعر بعد خصم المنتج + خصم الاشتراك
    v_discount := 0;
    select coalesce(max(discount_percentage), 0)
      into v_discount
      from public.discounts
     where product_id = v_sub.product_id and is_active = true;

    v_final := v_product.price * (1 - v_discount / 100) * (1 - v_sub_discount / 100);
    v_subtotal := round(v_final * v_sub.quantity * 100) / 100;

    -- رسوم التوصيل
    v_deliv := 0;
    if not v_product.for_all and v_product.pharmacy_id is not null and v_subtotal < v_free_threshold then
      select delivery_available, coalesce(delivery_fee, 0)
        into v_settings
        from public.pharmacies ph
       where ph.id = v_product.pharmacy_id;
      if v_settings.delivery_available = true then
        v_deliv := case when v_settings.delivery_fee > 0 then v_settings.delivery_fee else v_delivery_fee end;
      end if;
    end if;

    v_cod := case when coalesce(v_sub.payment_method, 'cash_on_delivery') = 'cash_on_delivery' then coalesce(greatest(0, v_cod_fee), 0) else 0 end;
    v_total := round((v_subtotal + v_deliv + v_cod) * 100) / 100;

    -- إنشاء مجموعة الطلب + الطلب + خصم المخزون
    v_order_group_id := gen_random_uuid();

    insert into public.order_groups (
      id, customer_id, address, note, status, payment_method,
      delivery_fee, total_price
    ) values (
      v_order_group_id, v_sub.customer_id, v_sub.address,
      'تجديد اشتراك شهري تلقائي — ' || v_product.name,
      'pending', coalesce(v_sub.payment_method, 'cash_on_delivery'),
      round(v_deliv * 100) / 100, v_total
    );

    insert into public.orders (
      customer_id, product_id, pharmacy_id, quantity,
      total_price, address, status, payment_method, order_group_id
    ) values (
      v_sub.customer_id, v_sub.product_id, v_product.pharmacy_id, v_sub.quantity,
      round(v_subtotal * 100) / 100, v_sub.address, 'pending',
      coalesce(v_sub.payment_method, 'cash_on_delivery'), v_order_group_id
    );

    update public.products
       set stock_quantity = stock_quantity - v_sub.quantity,
           updated_at = v_now
     where id = v_sub.product_id;

    insert into public.notifications (customer_id, type, title, body, read)
    values (v_sub.customer_id, 'subscription',
            'تم تجديد اشتراكك في ' || v_product.name,
            'طلبك الشهري قيد التنفيذ بمبلغ ' || v_total || ' ج.م (دفع عند الاستلام).',
            false);

    update public.chronic_subscriptions
       set next_run_at = v_now + (coalesce(v_sub.interval_days, 30) || ' days')::interval,
           updated_at = v_now
     where id = v_sub.id;

    v_renewed := v_renewed + 1;
  end loop;

  return jsonb_build_object(
    'enabled', true,
    'renewed', v_renewed,
    'paused', v_paused
  );
end;
$$;

revoke all on function public.renew_chronic_subscriptions() from public;
grant execute on function public.renew_chronic_subscriptions() to service_role;