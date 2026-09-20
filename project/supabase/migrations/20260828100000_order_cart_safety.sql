-- =============================================================
-- 20260828 — حماية سير الشراء (الخطوة 4):
--  1) التخلص من group طلب "يتيم" عند فشل إدراج الـ orders (no orders).
--  2) التحقق من توفر المخزون قبل إتمام الطلب.
-- يعمل الاثنان على السيرفر بصلاحيات مرتفعة (SECURITY DEFINER) مع
-- التحقق من الملكية، فلا يمكن للعميل حذف/قراءة ما لا يخصه.
-- =============================================================

-- -------------------------------------------------------------
-- 1) discard_empty_order_group: حذف order_groups الخاصة بالمتصل
--    وبدون أي orders مرتبطة بها (تُستدعى عند فشل إدراج الـ orders).
-- -------------------------------------------------------------
create or replace function public.discard_empty_order_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  if p_group_id is null then
    return;
  end if;

  -- لا يسمح إلا لملاّك المجموعة، أو الأدمن
  if not exists (
    select 1 from public.order_groups
    where id = p_group_id
      and (customer_id = auth.uid() or public.is_site_admin())
  ) then
    raise exception 'لا يمكنك حذف هذا الطلب.';
  end if;

  -- احذف فقط إن كان بلا orders (أي "يتيم") — لا نمس طلباً مكتملاً أبداً
  select count(*) into v_count
    from public.orders
   where order_group_id = p_group_id;

  if v_count = 0 then
    delete from public.order_groups where id = p_group_id;
  end if;
end;
$$;

revoke all on function public.discard_empty_order_group(uuid) from public;
grant execute on function public.discard_empty_order_group(uuid) to authenticated;

-- -------------------------------------------------------------
-- 2) validate_cart_stock: التحقق من توفر المخزون لكل منتج في السلة.
--    p_items = [ {product_id, quantity}, ... ]
--    يرجع مصفوفة بأسماء المنتجات المتجاوزة للمخزون (فارغاً = متاح).
-- -------------------------------------------------------------
create or replace function public.validate_cart_stock(p_items jsonb)
returns table (product_id uuid, product_name text, requested int, available int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_pid uuid;
  v_qty int;
  v_stock int;
  v_name text;
begin
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_pid := (v_item ->> 'product_id')::uuid;
    v_qty := (v_item ->> 'quantity')::int;

    select pr.stock_quantity, pr.name
      into v_stock, v_name
      from public.products pr
     where pr.id = v_pid;

    if v_stock is not null and v_qty > v_stock then
      product_id := v_pid;
      product_name := v_name;
      requested := v_qty;
      available := v_stock;
      return next;
    end if;
  end loop;

  return;
end;
$$;

revoke all on function public.validate_cart_stock(jsonb) from public;
grant execute on function public.validate_cart_stock(jsonb) to authenticated;
