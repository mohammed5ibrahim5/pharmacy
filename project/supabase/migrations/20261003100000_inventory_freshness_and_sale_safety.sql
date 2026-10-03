-- Keep spreadsheet uploads scoped to existing pharmacy products. A missing or
-- ambiguous barcode is an error, never an implicit new product.
create or replace function public.import_pharmacy_inventory(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_pharmacy_id uuid;
  v_barcode text;
  v_price numeric;
  v_stock integer;
  v_reorder integer;
  v_product_id uuid;
  v_old_stock integer;
  v_matches integer;
  v_updated integer := 0;
  v_row_number integer := 0;
  v_row_key text;
  v_seen_keys text[] := '{}'::text[];
begin
  if p_rows is null or jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'يجب إرسال صفوف المخزون في صورة قائمة.';
  end if;
  if jsonb_array_length(p_rows) = 0
     or jsonb_array_length(p_rows) > 500 then
    raise exception 'يجب أن يحتوي الملف على 1 إلى 500 صف.';
  end if;

  for v_row in
    select value
      from jsonb_array_elements(p_rows) with ordinality as rows(value, row_number)
     order by row_number
  loop
    v_row_number := v_row_number + 1;
    begin
      v_pharmacy_id := (v_row ->> 'pharmacy_id')::uuid;
      v_barcode := nullif(trim(v_row ->> 'barcode'), '');
      v_price := (v_row ->> 'price')::numeric;
      v_stock := (v_row ->> 'stock_quantity')::integer;
      v_reorder := coalesce((v_row ->> 'reorder_level')::integer, 5);
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'بيانات غير صالحة في الصف رقم %.', v_row_number;
    end;

    if v_pharmacy_id is null or v_barcode is null
       or v_price is null or v_price < 0
       or v_price::text in ('NaN', 'Infinity', '-Infinity')
       or v_stock is null or v_stock < 0
       or v_reorder < 0 then
      raise exception 'الصف رقم % يتطلب صيدلية وباركودًا وسعرًا ومخزونًا صالحًا.', v_row_number;
    end if;

    if public.is_site_admin() is not true
       and public.current_owner_pharmacy_id() is distinct from v_pharmacy_id then
      raise exception 'لا تملك صلاحية تحديث مخزون هذه الصيدلية.';
    end if;

    v_row_key := v_pharmacy_id::text || ':' || v_barcode;
    if v_row_key = any(v_seen_keys) then
      raise exception 'الباركود مكرر في الملف عند الصف رقم %.', v_row_number;
    end if;
    v_seen_keys := array_append(v_seen_keys, v_row_key);

    select count(*)
      into v_matches
      from public.products
     where pharmacy_id = v_pharmacy_id
       and barcode = v_barcode;

    if v_matches = 0 then
      raise exception 'لم يُعثر على منتج بهذا الباركود في الصيدلية عند الصف رقم %.', v_row_number;
    elsif v_matches > 1 then
      raise exception 'الباركود مسجل أكثر من مرة في الصيدلية عند الصف رقم %؛ راجع البيانات أولاً.', v_row_number;
    end if;

    select id, coalesce(stock_quantity, 0)
      into v_product_id, v_old_stock
      from public.products
     where pharmacy_id = v_pharmacy_id
       and barcode = v_barcode
     for update;

    update public.products
       set price = v_price,
           stock_quantity = v_stock,
           reorder_level = v_reorder,
           is_available = v_stock > 0,
           updated_at = now()
     where id = v_product_id
       and pharmacy_id = v_pharmacy_id;

    if v_old_stock is distinct from v_stock then
      insert into public.inventory_movements (
        product_id, movement_type, quantity, reason, note, actor_id
      ) values (
        v_product_id,
        'import',
        abs(v_stock - v_old_stock),
        'Spreadsheet inventory update',
        'Stock quantity set to ' || v_stock,
        auth.uid()
      );
    end if;

    v_updated := v_updated + 1;
  end loop;

  return jsonb_build_object('updated', v_updated);
end;
$$;

revoke all on function public.import_pharmacy_inventory(jsonb) from public, anon;
grant execute on function public.import_pharmacy_inventory(jsonb) to authenticated;

-- Controlled status is an admin-maintained safety flag. Pharmacy owners may
-- update stock and prices but cannot clear or assign this classification.
alter table public.products
  add column if not exists is_controlled boolean not null default false;

create or replace function public.guard_product_controlled_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_site_admin() is not true then
    if tg_op = 'INSERT' then
      new.is_controlled := false;
    else
      new.is_controlled := old.is_controlled;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists products_guard_controlled_status on public.products;
create trigger products_guard_controlled_status
  before insert or update of is_controlled on public.products
  for each row execute function public.guard_product_controlled_status();

-- Wrap the existing order functions so all normal checkout paths enforce
-- prescription and controlled-medicine rules before any order is created.
alter function public.place_order(jsonb, text, text, uuid, text, text, text, integer, uuid, uuid[])
  rename to place_order_before_sale_safety;

revoke all on function public.place_order_before_sale_safety(jsonb, text, text, uuid, text, text, text, integer, uuid, uuid[]) from public, anon, authenticated;

create or replace function public.place_order(
  p_items jsonb,
  p_address text,
  p_note text,
  p_family_member_id uuid,
  p_payment_method text,
  p_payment_number text,
  p_payment_screenshot_url text,
  p_redeem_chunks integer,
  p_rx_id uuid,
  p_rx_product_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_ids uuid[];
  v_required_rx_ids uuid[];
  v_submitted_rx_ids uuid[];
begin
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'بيانات الطلب غير صالحة.';
  end if;

  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول أولاً.';
  end if;

  select array_agg(distinct p.id order by p.id)
    into v_item_ids
    from jsonb_array_elements(p_items) as item(value)
    join public.products p on p.id = (item.value ->> 'product_id')::uuid;

  if exists (
    select 1
      from unnest(coalesce(v_item_ids, '{}'::uuid[])) as item_id
      join public.products p on p.id = item_id
     where p.is_controlled
  ) then
    raise exception 'هذا الدواء غير متاح للبيع أو الحجز عبر الإنترنت.';
  end if;

  select array_agg(p.id order by p.id)
    into v_required_rx_ids
    from public.products p
   where p.id = any(coalesce(v_item_ids, '{}'::uuid[]))
     and p.requires_prescription;
  v_required_rx_ids := coalesce(v_required_rx_ids, '{}'::uuid[]);

  select array_agg(product_id order by product_id)
    into v_submitted_rx_ids
    from (
      select distinct product_id
        from unnest(coalesce(p_rx_product_ids, '{}'::uuid[])) as product_id
       where product_id = any(coalesce(v_item_ids, '{}'::uuid[]))
    ) submitted;
  v_submitted_rx_ids := coalesce(v_submitted_rx_ids, '{}'::uuid[]);

  if cardinality(v_required_rx_ids) > 0 then
    if p_rx_id is null or v_submitted_rx_ids is distinct from v_required_rx_ids then
      raise exception 'يلزم إرفاق وصفة معتمدة ومطابقة لكل دواء يتطلب وصفة.';
    end if;

    if not exists (
      select 1
        from public.prescriptions rx
       where rx.id = p_rx_id
         and rx.customer_id = auth.uid()
         and rx.pipeline_status = 'approved'
         and rx.order_group_id is null
    ) then
      raise exception 'يجب اختيار وصفة معتمدة تخص حسابك.';
    end if;
  end if;

  return public.place_order_before_sale_safety(
    p_items,
    p_address,
    p_note,
    p_family_member_id,
    p_payment_method,
    p_payment_number,
    p_payment_screenshot_url,
    p_redeem_chunks,
    p_rx_id,
    p_rx_product_ids
  );
end;
$$;

revoke all on function public.place_order(jsonb, text, text, uuid, text, text, text, integer, uuid, uuid[]) from public, anon;
grant execute on function public.place_order(jsonb, text, text, uuid, text, text, text, integer, uuid, uuid[]) to authenticated;

alter function public.place_order_guest(jsonb, text, text, text, text, text)
  rename to place_order_guest_before_sale_safety;

revoke all on function public.place_order_guest_before_sale_safety(jsonb, text, text, text, text, text) from public, anon, authenticated;

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
begin
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'بيانات الطلب غير صالحة.';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_items) as item(value)
      join public.products p on p.id = (item.value ->> 'product_id')::uuid
     where p.is_controlled or p.requires_prescription
  ) then
    raise exception 'الأدوية المراقبة أو التي تتطلب وصفة لا يمكن طلبها كضيف.';
  end if;

  return public.place_order_guest_before_sale_safety(
    p_items,
    p_guest_name,
    p_guest_phone,
    p_address,
    p_note,
    p_payment_method
  );
end;
$$;

revoke all on function public.place_order_guest(jsonb, text, text, text, text, text) from public;
grant execute on function public.place_order_guest(jsonb, text, text, text, text, text) to anon, authenticated;

-- Prevent clients from creating or changing recurring subscriptions for
-- products that cannot be ordered online.
create or replace function public.guard_chronic_subscription_sale_safety()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
      from public.products p
     where p.id = new.product_id
       and (p.is_controlled or p.requires_prescription)
  ) then
    raise exception 'الأدوية المراقبة أو التي تتطلب وصفة لا يمكن الاشتراك فيها إلكترونياً.';
  end if;
  return new;
end;
$$;

drop trigger if exists chronic_subscriptions_guard_sale_safety on public.chronic_subscriptions;
create trigger chronic_subscriptions_guard_sale_safety
  before insert or update of product_id on public.chronic_subscriptions
  for each row execute function public.guard_chronic_subscription_sale_safety();

-- Pause legacy subscriptions when a product is classified as controlled or
-- prescription-only, before the scheduled renewal job can create an order.
alter function public.renew_chronic_subscriptions()
  rename to renew_chronic_subscriptions_before_sale_safety;

revoke all on function public.renew_chronic_subscriptions_before_sale_safety() from public, anon, authenticated, service_role;

create or replace function public.renew_chronic_subscriptions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  with paused as (
    update public.chronic_subscriptions s
       set active = false, updated_at = now()
      from public.products p
     where p.id = s.product_id
       and (p.is_controlled or p.requires_prescription)
       and s.active
    returning s.customer_id, s.product_id
  )
  insert into public.notifications (customer_id, type, title, body, read)
  select paused.customer_id,
         'subscription',
         'تم إيقاف الاشتراك لأسباب تتعلق بسلامة الدواء',
         'لا يمكن تجديد اشتراك هذا المنتج عبر الإنترنت. تواصل مع الصيدلي.',
         false
    from paused;

  v_result := public.renew_chronic_subscriptions_before_sale_safety();
  return v_result;
end;
$$;

revoke all on function public.renew_chronic_subscriptions() from public, anon, authenticated;
grant execute on function public.renew_chronic_subscriptions() to service_role;

notify pgrst, 'reload schema';
