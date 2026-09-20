-- =============================================================
-- 20260907 — طلب بدون تسجيل (تجربة الضيوف) + متابعة الطلب برقم الموبايل
--   1) أعمدة guest_name / guest_phone على orders و order_groups
--   2) place_order_guest: نفس منطق place_order (سعر/مخزون/توصيل ذرّي)
--      لكن بدون تسجيل دخول — بدون ولاء وبدون عائلة وبدون دفع أونلاين
--      وبدون روشتة (أدوية الروشتة محجوزة للأعضاء المسجلين).
--      يربط الطلب بصف customer موجود بنفس الهاتف إن وُجد.
--   3) track_guest_orders: متابعة الطلبات برقم الهاتف.
-- =============================================================

alter table public.orders add column if not exists guest_name text;
alter table public.orders add column if not exists guest_phone text;
alter table public.order_groups add column if not exists guest_name text;
alter table public.order_groups add column if not exists guest_phone text;

create index if not exists order_groups_guest_phone_idx
  on public.order_groups (guest_phone);

-- =============================================================
-- إنشاء طلب ضيف: يحسب الأسعار/الخصومات/التوصيل من السيرفر ويثبّت
-- المخزون — لضمان أكبر حماية ممكنة لطلب لا يملك حساب.
-- =============================================================
create or replace function public.place_order_guest(
  p_items jsonb,
  p_guest_name text,
  p_guest_phone text,
  p_address text,
  p_note text,
  p_payment_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fj jsonb;
  v_row record;

  -- payment config
  v_delivery_fee numeric;
  v_free_threshold numeric;
  v_cod_fee numeric;
  v_show_cod boolean := true;
  v_instapay text := '';
  v_vodafone text := '';

  -- متجهات العناصر المجمّعة
  v_ids uuid[] := '{}';
  v_qtys int[] := '{}';
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
  v_total_after numeric := 0;

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

  -- customer match
  v_customer_id uuid := null;
  v_phone text;

  v_free_global boolean := false;

  v_order_group_id uuid := gen_random_uuid();
  v_created_orders int := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'السلة فارغة.';
  end if;

  v_phone := regexp_replace(coalesce(p_guest_phone,''), '[^0-9]', '', 'g');
  if char_length(v_phone) = 13 and left(v_phone, 2) = '20' then
    v_phone := substring(v_phone from 3);
  end if;
  if v_phone ~ '^(01[0-9]{9})$' = false then
    raise exception 'رقم الهاتف غير صالح — أدخل رقم موبايل مصري صحيح.';
  end if;

  if p_guest_name is null or char_length(trim(p_guest_name)) < 2 then
    raise exception 'يرجى إدخال اسم المستلم كاملاً.';
  end if;

  -- الضيف لا يستطيع استكمال غير الدفع النقدي/الكاش
  if p_payment_method not in ('cash_on_delivery','vodafone_cash','instapay') then
    raise exception 'طريقة دفع غير متاحة للطلبات بدون تسجيل.';
  end if;

  -- ===== ربط بصف العميل الموجود بنفس الهاتف (إن وُجد) =====
  select id into v_customer_id
    from public.customers
   where regexp_replace(coalesce(customers.phone,''), '[^0-9]', '', 'g') = v_phone
   limit 1;

  -- ===== قراءة الإعدادات =====
  select features_json into v_row from public.site_settings order by id limit 1;
  v_fj := coalesce(v_row.features_json, '{}')::jsonb;

  v_free_threshold := coalesce(nullif(nullif(trim(coalesce(v_fj->'paymentConfig'->>'freeDeliveryThreshold','')),''),'null')::numeric, 300);
  v_delivery_fee   := coalesce(nullif(nullif(trim(coalesce(v_fj->'paymentConfig'->>'deliveryFee','')),''),'null')::numeric, 25);
  v_cod_fee        := coalesce(nullif(nullif(trim(coalesce(v_fj->'paymentConfig'->>'cashOnDeliveryFee','')),''),'null')::numeric, 10);
  v_show_cod       := coalesce((v_fj->'paymentConfig'->>'showCashOnDelivery')::boolean, true);
  v_instapay       := coalesce(v_fj->'paymentConfig'->>'instapay','');
  v_vodafone       := coalesce(v_fj->'paymentConfig'->>'vodafoneCash','');

  if p_payment_method = 'cash_on_delivery' and not v_show_cod then
    raise exception 'الدفع عند الاستلام غير متاح حالياً.';
  end if;
  if p_payment_method = 'instapay' and nullif(v_instapay,'') is null then
    raise exception 'لم يتم إعداد رقم انستا باي بعد.';
  end if;
  if p_payment_method = 'vodafone_cash' and nullif(v_vodafone,'') is null then
    raise exception 'لم يتم إعداد رقم فودافون كاش بعد.';
  end if;

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

  -- ===== تمريرة أولى: subtotal + خصم =====
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
  v_total_after := v_total;

  -- ===== إنشاء order_groups =====
  insert into public.order_groups (
    id, customer_id, guest_name, guest_phone, address, note,
    status, payment_method, payment_number,
    delivery_fee, total_price
  ) values (
    v_order_group_id, v_customer_id, trim(p_guest_name), v_phone, p_address, p_note,
    'pending', p_payment_method, null,
    round(v_group_total * 100) / 100, round(v_total_after * 100) / 100
  );

  -- ===== إنشاء صفوف orders + خصم المخزون التنافسي =====
  v_created_orders := 0;
  for v_i in 1 .. v_n loop
    update public.products
       set stock_quantity = stock_quantity - v_qtys[v_i],
           updated_at = now()
     where id = v_ids[v_i] and stock_quantity >= v_qtys[v_i];

    if not found then
      raise exception 'الكمية المطلوبة غير متوفرة لـ: %', v_names[v_i];
    end if;

    insert into public.orders (
      customer_id, guest_name, guest_phone, product_id, pharmacy_id, quantity,
      total_price, address, note, status, payment_method,
      payment_number, order_group_id
    ) values (
      v_customer_id, trim(p_guest_name), v_phone, v_ids[v_i], v_pharms[v_i], v_qtys[v_i],
      round(greatest(0, v_finals[v_i] * v_qtys[v_i]) * 100) / 100,
      p_address, p_note, 'pending', p_payment_method,
      null, v_order_group_id
    );
    v_created_orders := v_created_orders + 1;
  end loop;

  return jsonb_build_object(
    'order_group_id', v_order_group_id,
    'subtotal', round(v_subtotal * 100) / 100,
    'total_delivery', round(v_group_total * 100) / 100,
    'cod_fee', round(v_cod * 100) / 100,
    'loyalty_discount', 0,
    'total', round(v_total_after * 100) / 100,
    'points_used', 0,
    'count', v_created_orders
  );
end;
$$;

-- =============================================================
-- متابعة الطلبات برقم الهاتف: يرجع الطلبات والمنتجات المرتبطة بها
-- =============================================================
create or replace function public.track_guest_orders(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_result jsonb;
begin
  v_phone := regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g');
  if char_length(v_phone) = 13 and left(v_phone, 2) = '20' then
    v_phone := substring(v_phone from 3);
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', g.id,
      'status', g.status,
      'total_price', round(g.total_price * 100) / 100,
      'payment_method', g.payment_method,
      'created_at', g.created_at,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', o.id,
          'product_id', o.product_id,
          'product_name', coalesce(pr.name, ''),
          'quantity', o.quantity,
          'total_price', round(o.total_price * 100) / 100,
          'status', o.status
        ) order by o.created_at)
        from public.orders o
        left join public.products pr on pr.id = o.product_id
        where o.order_group_id = g.id
      ), '[]'::jsonb)
    ) order by g.created_at desc
  ) into v_result
  from public.order_groups g
  where (
    (g.guest_phone is not null and regexp_replace(g.guest_phone, '[^0-9]', '', 'g') = v_phone)
    or
    (g.customer_id is not null and exists (
      select 1 from public.customers c
      where c.id = g.customer_id
        and regexp_replace(coalesce(c.phone,''), '[^0-9]', '', 'g') = v_phone
    ))
  );

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all on function public.place_order_guest(jsonb, text, text, text, text, text) from public;
grant execute on function public.place_order_guest(jsonb, text, text, text, text, text) to anon, authenticated;

revoke all on function public.track_guest_orders(text) from public;
grant execute on function public.track_guest_orders(text) to anon, authenticated;