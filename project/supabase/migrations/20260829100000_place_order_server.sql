-- =============================================================
-- 20260829 — الخطوة 5: إنشاء الطلب بالكامل على السيرفر (RPC atomic)
--   بدلاً من إرسال أسعار محسوبة من المتصفح، يقوم place_order بما يلي
--   داخل معاملة واحدة (عملية ذرّية تُرجع rollback عند أي خطأ):
--     1) يتحقق من تسجيل الدخول + طريقة الدفع + السلة.
--     2) يقرأ إعدادات الدفع/الولاء من site_settings.features_json.
--     3) لكل منتج: يتأكد من الكمية + يعيد حساب السعر من DB (بالخصم)
--        + يتحقق من المخزون + يخصم المخزون بشكل تنافسي.
--     4) يحسب الإجمالي (التوصيل/COD/خصم الولاء) من السيرفر.
--     5) ينشئ order_groups + orders بالأسعار المحسوبة على السيرفر
--        (يتجاهل أي سعر يرسله العميل).
--     6) يخصم نقاط الولاء ويسجّل حركتها.
--     7) يربط الروشتة المعتمدة (اختياري) عبر link_rx_to_order_group.
-- =============================================================

create or replace function public.place_order(
  p_items jsonb,
  p_address text,
  p_note text,
  p_family_member_id uuid,
  p_payment_method text,
  p_payment_number text,
  p_payment_screenshot_url text,
  p_redeem_chunks int,
  p_rx_id uuid,
  p_rx_product_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_fj jsonb;
  v_row record;

  -- payment config
  v_delivery_fee numeric;
  v_free_threshold numeric;
  v_cod_fee numeric;
  v_show_online boolean := true;
  v_show_cod boolean := true;
  v_instapay text := '';
  v_vodafone text := '';

  -- loyalty config
  v_loyal_enabled boolean := true;
  v_redeem_threshold int := 50;
  v_redeem_value numeric := 50;

  -- متجهات العناصر المجمّعة (فريد لكل product_id)
  v_ids uuid[] := '{}';
  v_qtys int[] := '{}';
  v_prices numeric[] := '{}';
  v_finals numeric[] := '{}';
  v_names text[] := '{}';
  v_pharms uuid[] := '{}';
  v_n int := 0;
  v_i int;
  v_found_idx int;

  -- accumulator
  v_subtotal numeric := 0;
  v_group_total numeric := 0;
  v_cod numeric := 0;
  v_total numeric := 0;
  v_loyal_discount numeric := 0;
  v_total_after numeric := 0;
  v_points_used int := 0;
  v_loyal_balance int := 0;

  -- per-product temp
  v_pid uuid;
  v_qty int;
  v_price numeric;
  v_stock int;
  v_name text;
  v_discount numeric;
  v_final numeric;
  v_for_all boolean;
  v_pharmacy_id uuid;
  v_deliv_avail boolean;
  v_deliv_fee numeric;
  v_tmp_fee numeric;

  -- delivery
  v_free_global boolean := false;

  -- خصم الولاء الموزع
  v_line_sum numeric := 0;
  v_acc numeric := 0;
  v_rounded numeric;
  v_share numeric;
  v_row_total numeric;

  v_order_group_id uuid := gen_random_uuid();
  v_created_orders int := 0;
begin
  if v_uid is null then
    raise exception 'يجب تسجيل الدخول أولاً.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'السلة فارغة.';
  end if;

  if p_payment_method not in ('cash_on_delivery','online','vodafone_cash','instapay') then
    raise exception 'طريقة دفع غير صالحة.';
  end if;

  if p_redeem_chunks is null or p_redeem_chunks < 0 then
    p_redeem_chunks := 0;
  end if;

  -- ===== قراءة الإعدادات =====
  select features_json into v_row from public.site_settings order by id limit 1;
  v_fj := coalesce(v_row.features_json, '{}')::jsonb;

  v_free_threshold := coalesce(nullif(nullif(trim(coalesce(v_fj->'paymentConfig'->>'freeDeliveryThreshold','')),''),'null')::numeric, 300);
  v_delivery_fee   := coalesce(nullif(nullif(trim(coalesce(v_fj->'paymentConfig'->>'deliveryFee','')),''),'null')::numeric, 25);
  v_cod_fee        := coalesce(nullif(nullif(trim(coalesce(v_fj->'paymentConfig'->>'cashOnDeliveryFee','')),''),'null')::numeric, 10);
  v_show_online    := coalesce((v_fj->'paymentConfig'->>'showOnlinePayment')::boolean, true);
  v_show_cod       := coalesce((v_fj->'paymentConfig'->>'showCashOnDelivery')::boolean, true);
  v_instapay       := coalesce(v_fj->'paymentConfig'->>'instapay','');
  v_vodafone       := coalesce(v_fj->'paymentConfig'->>'vodafoneCash','');

  if p_payment_method = 'online' and not v_show_online then
    raise exception 'الدفع أونلاين غير متاح حالياً.';
  end if;
  if p_payment_method = 'cash_on_delivery' and not v_show_cod then
    raise exception 'الدفع عند الاستلام غير متاح حالياً.';
  end if;
  if p_payment_method = 'instapay' and nullif(v_instapay,'') is null then
    raise exception 'لم يتم إعداد رقم انستا باي بعد.';
  end if;
  if p_payment_method = 'vodafone_cash' and nullif(v_vodafone,'') is null then
    raise exception 'لم يتم إعداد رقم فودافون كاش بعد.';
  end if;

  v_loyal_enabled    := coalesce((v_fj->'loyaltyConfig'->>'enabled')::boolean, true);
  v_redeem_threshold := coalesce((v_fj->'loyaltyConfig'->>'redeemThreshold')::int, 50);
  v_redeem_value     := coalesce((v_fj->'loyaltyConfig'->>'redeemValue')::numeric, 50);

  -- ===== تجميع العناصر (دمج تكرار المنتج) =====
  for v_row in select * from jsonb_array_elements(p_items)
  loop
    v_pid := (v_row.value ->> 'product_id')::uuid;
    v_qty := (v_row.value ->> 'quantity')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'كمية غير صالحة لأحد المنتجات.';
    end if;

    v_found_idx := 0;
    for v_i in 1 .. coalesce(array_length(v_ids,1),0) loop
      if v_ids[v_i] = v_pid then
        v_found_idx := v_i;
        exit;
      end if;
    end loop;

    if v_found_idx > 0 then
      v_qtys[v_found_idx] := v_qtys[v_found_idx] + v_qty;
    else
      v_n := v_n + 1;
      v_ids[v_n] := v_pid;
      v_qtys[v_n] := v_qty;
    end if;
  end loop;

  -- ===== تمريرة أولى: احسب subtotal + خصم للـ free delivery =====
  v_subtotal := 0;
  for v_i in 1 .. v_n loop
    select pr.price, pr.stock_quantity, pr.name, pr.pharmacy_id,
           coalesce(pr.for_all_pharmacies, false)
      into v_price, v_stock, v_name, v_pharmacy_id, v_for_all
      from public.products pr
     where pr.id = v_ids[v_i];

    if v_price is null then
      raise exception 'منتج غير موجود: %', v_name;
    end if;

    v_discount := 0;
    select coalesce(max(discount_percentage),0)
      into v_discount
      from public.discounts
     where product_id = v_ids[v_i] and is_active = true;

    v_final := v_price * (1 - v_discount / 100);
    v_prices[v_i] := v_price;
    v_finals[v_i] := v_final;
    v_names[v_i] := v_name;
    v_pharms[v_i] := v_pharmacy_id;

    v_subtotal := v_subtotal + v_final * v_qtys[v_i];
  end loop;

  v_free_global := (v_free_threshold > 0 and v_subtotal >= v_free_threshold);

  -- ===== رسوم التوصيل =====
  v_group_total := 0;
  for v_i in 1 .. v_n loop
    select coalesce(for_all_pharmacies,false), pharmacy_id
      into v_for_all, v_pharmacy_id
      from public.products where id = v_ids[v_i];

    if v_for_all or v_pharmacy_id is null then
      continue;
    end if;
    if v_free_global then
      continue;
    end if;

    select delivery_available, coalesce(delivery_fee,0)
      into v_deliv_avail, v_deliv_fee
      from public.pharmacies where id = v_pharmacy_id;

    if v_deliv_avail = false then
      continue;
    end if;

    v_tmp_fee := case when v_deliv_fee > 0 then v_deliv_fee else v_delivery_fee end;
    v_group_total := v_group_total + v_tmp_fee;
  end loop;

  v_cod := case when p_payment_method = 'cash_on_delivery' then greatest(0, v_cod_fee) else 0 end;
  v_total := v_subtotal + v_group_total + v_cod;

  -- ===== الولاء =====
  select loyalty_points into v_loyal_balance
    from public.customers where id = v_uid;
  v_loyal_balance := coalesce(v_loyal_balance,0);

  if v_loyal_enabled and v_redeem_value > 0 and p_redeem_chunks > 0 then
    if p_redeem_chunks > floor(v_loyal_balance::numeric / greatest(v_redeem_threshold,1))
       or p_redeem_chunks > floor(v_subtotal / v_redeem_value) then
      raise exception 'النقاط المستبدلة تتجاوز النقاط المتاحة.';
    end if;
  elsif p_redeem_chunks > 0 then
    raise exception 'استبدال النقاط غير متاح حالياً.';
  end if;

  v_loyal_discount := coalesce(round(p_redeem_chunks * v_redeem_value * 100) / 100, 0);
  v_total_after := greatest(0, v_total - v_loyal_discount);
  v_points_used := p_redeem_chunks * v_redeem_threshold;

  -- ===== إنشاء order_groups =====
  insert into public.order_groups (
    id, customer_id, family_member_id, address, note,
    status, payment_method, payment_number, payment_screenshot_url,
    delivery_fee, total_price, loyalty_discount, points_used
  ) values (
    v_order_group_id, v_uid, p_family_member_id, p_address, p_note,
    'pending', p_payment_method, p_payment_number, p_payment_screenshot_url,
    round(v_group_total * 100) / 100, round(v_total_after * 100) / 100,
    round(v_loyal_discount * 100) / 100, v_points_used
  );

  -- ===== إنشاء صفوف orders + خصم المخزون التنافسي =====
  v_line_sum := 0;
  for v_i in 1 .. v_n loop
    v_line_sum := v_line_sum + v_finals[v_i] * v_qtys[v_i];
  end loop;
  if v_line_sum = 0 then v_line_sum := 1; end if;

  v_acc := 0;
  v_created_orders := 0;
  for v_i in 1 .. v_n loop
    -- خصم المخزون التنافسي (يحدث فقط إن كانت الكمية متوفرة فعلاً)
    update public.products
       set stock_quantity = stock_quantity - v_qtys[v_i],
           updated_at = now()
     where id = v_ids[v_i] and stock_quantity >= v_qtys[v_i];

    if not found then
      raise exception 'الكمية المطلوبة غير متوفرة لـ: %', v_names[v_i];
    end if;

    v_share := round((v_finals[v_i] * v_qtys[v_i] / v_line_sum) * v_loyal_discount * 100) / 100;
    v_acc := v_acc + v_share;

    -- آخر عنصر يأخذ باقي الخصم لضمان تطابق الإجمالي
    if v_i = v_n then
      v_share := round((v_loyal_discount - (v_acc - v_share)) * 100) / 100;
    end if;

    v_row_total := v_finals[v_i] * v_qtys[v_i] - v_share;

    insert into public.orders (
      customer_id, family_member_id, product_id, pharmacy_id, quantity,
      total_price, address, note, status, payment_method,
      payment_number, payment_screenshot_url, order_group_id
    ) values (
      v_uid, p_family_member_id, v_ids[v_i], v_pharms[v_i], v_qtys[v_i],
      round(greatest(0, v_row_total) * 100) / 100,
      p_address, p_note, 'pending', p_payment_method,
      p_payment_number, p_payment_screenshot_url, v_order_group_id
    );
    v_created_orders := v_created_orders + 1;
  end loop;

  -- ===== خصم نقاط الولاء =====
  if v_points_used > 0 then
    update public.customers
       set loyalty_points = greatest(0, loyalty_points - v_points_used)
     where id = v_uid;

    insert into public.loyalty_transactions (customer_id, points, reason)
    values (v_uid, -v_points_used,
            'استبدال ' || v_points_used || ' نقطة بخصم ' || round(v_loyal_discount,2) || ' ج.م');
  end if;

  -- ===== ربط الروشتة (اختياري) =====
  if p_rx_id is not null then
    perform public.link_rx_to_order_group(p_rx_id, v_order_group_id, p_rx_product_ids);
  end if;

  -- ===== الإرجاع =====
  return jsonb_build_object(
    'order_group_id', v_order_group_id,
    'subtotal', round(v_subtotal * 100) / 100,
    'total_delivery', round(v_group_total * 100) / 100,
    'cod_fee', round(v_cod * 100) / 100,
    'loyalty_discount', round(v_loyal_discount * 100) / 100,
    'total', round(v_total_after * 100) / 100,
    'points_used', v_points_used,
    'count', v_created_orders
  );
end;
$$;

revoke all on function public.place_order(jsonb, text, text, uuid, text, text, text, int, uuid, uuid[]) from public;
grant execute on function public.place_order(jsonb, text, text, uuid, text, text, text, int, uuid, uuid[]) to authenticated;
