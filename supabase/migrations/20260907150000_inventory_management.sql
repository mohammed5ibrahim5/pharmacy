-- Inventory management foundation: reorder thresholds, batches, movements, reservations.

alter table public.products
  add column if not exists reorder_level integer not null default 5
    check (reorder_level >= 0),
  add column if not exists reserved_quantity integer not null default 0
    check (reserved_quantity >= 0);

create table if not exists public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  batch_number text not null,
  expiry_date date,
  received_quantity integer not null default 0 check (received_quantity >= 0),
  available_quantity integer not null default 0 check (available_quantity >= 0),
  status text not null default 'active' check (status in ('active', 'quarantined', 'expired', 'depleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, batch_number)
);

create index if not exists inventory_batches_product_expiry_idx
  on public.inventory_batches (product_id, expiry_date, status);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  batch_id uuid references public.inventory_batches(id) on delete set null,
  movement_type text not null check (movement_type in ('receipt', 'sale', 'reservation', 'release', 'damage', 'expiry', 'adjustment', 'import')),
  quantity integer not null check (quantity > 0),
  reason text,
  note text,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_created_idx
  on public.inventory_movements (product_id, created_at desc);

create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_key text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  order_group_id uuid references public.order_groups(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'consumed', 'released', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (reservation_key, product_id)
);

create index if not exists stock_reservations_active_idx
  on public.stock_reservations (status, expires_at);

alter table public.inventory_batches enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.stock_reservations enable row level security;

create or replace function public.inventory_product_is_owned(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.products p
    where p.id = p_product_id
      and (p.pharmacy_id = public.current_owner_pharmacy_id() or public.is_site_admin())
  );
$$;

revoke all on function public.inventory_product_is_owned(uuid) from public;
grant execute on function public.inventory_product_is_owned(uuid) to authenticated;

drop policy if exists inventory_batches_select_owner on public.inventory_batches;
create policy inventory_batches_select_owner on public.inventory_batches for select to authenticated
  using (public.inventory_product_is_owned(product_id));
drop policy if exists inventory_batches_write_owner on public.inventory_batches;
create policy inventory_batches_write_owner on public.inventory_batches for all to authenticated
  using (public.inventory_product_is_owned(product_id))
  with check (public.inventory_product_is_owned(product_id));

drop policy if exists inventory_movements_select_owner on public.inventory_movements;
create policy inventory_movements_select_owner on public.inventory_movements for select to authenticated
  using (public.inventory_product_is_owned(product_id));

drop policy if exists stock_reservations_select_owner on public.stock_reservations;
create policy stock_reservations_select_owner on public.stock_reservations for select to authenticated
  using (public.inventory_product_is_owned(product_id) or customer_id = auth.uid() or public.is_site_admin());

create or replace function public.reserve_stock(
  p_reservation_key text,
  p_items jsonb,
  p_ttl_minutes integer default 15
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_expires_at timestamptz := now() + make_interval(mins => greatest(1, least(p_ttl_minutes, 60)));
begin
  if p_reservation_key is null or length(trim(p_reservation_key)) < 8 then
    raise exception 'Invalid reservation key';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Empty reservation';
  end if;

  perform public.release_stock(p_reservation_key);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid reservation quantity';
    end if;

    update public.products
       set reserved_quantity = reserved_quantity + v_quantity,
           updated_at = now()
     where id = v_product_id
       and is_available = true
       and stock_quantity - reserved_quantity >= v_quantity;
    if not found then
      raise exception 'Insufficient available stock';
    end if;

    insert into public.stock_reservations (reservation_key, product_id, quantity, customer_id, expires_at)
    values (p_reservation_key, v_product_id, v_quantity, auth.uid(), v_expires_at);
    insert into public.inventory_movements (product_id, movement_type, quantity, reason, actor_id)
    values (v_product_id, 'reservation', v_quantity, 'Checkout reservation', auth.uid());
  end loop;

  return jsonb_build_object('reservation_key', p_reservation_key, 'expires_at', v_expires_at);
exception when others then
  perform public.release_stock(p_reservation_key);
  raise;
end;
$$;

create or replace function public.release_stock(p_reservation_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  for v_row in
    select product_id, quantity
      from public.stock_reservations
     where reservation_key = p_reservation_key
       and status = 'active'
     for update
  loop
    update public.products
       set reserved_quantity = greatest(0, reserved_quantity - v_row.quantity), updated_at = now()
     where id = v_row.product_id;
    update public.stock_reservations
       set status = 'released'
     where reservation_key = p_reservation_key and product_id = v_row.product_id and status = 'active';
    insert into public.inventory_movements (product_id, movement_type, quantity, reason, actor_id)
    values (v_row.product_id, 'release', v_row.quantity, 'Checkout reservation released', auth.uid());
  end loop;
end;
$$;

create or replace function public.cleanup_expired_stock_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_count integer := 0;
begin
  for v_key in
    select distinct reservation_key
      from public.stock_reservations
     where status = 'active' and expires_at <= now()
  loop
    perform public.release_stock(v_key);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.consume_stock_reservation(p_reservation_key text, p_order_group_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  for v_row in
    select product_id, quantity
      from public.stock_reservations
     where reservation_key = p_reservation_key
       and status = 'active'
       and expires_at > now()
     for update
  loop
    update public.products
       set stock_quantity = greatest(0, stock_quantity - v_row.quantity),
           reserved_quantity = greatest(0, reserved_quantity - v_row.quantity), updated_at = now()
     where id = v_row.product_id;
    update public.stock_reservations
       set status = 'consumed', order_group_id = p_order_group_id
     where reservation_key = p_reservation_key and product_id = v_row.product_id and status = 'active';
    insert into public.inventory_movements (product_id, movement_type, quantity, reason, actor_id)
    values (v_row.product_id, 'sale', v_row.quantity, 'Checkout reservation consumed', auth.uid());
  end loop;
end;
$$;

revoke all on function public.reserve_stock(text, jsonb, integer) from public;
revoke all on function public.release_stock(text) from public;
revoke all on function public.consume_stock_reservation(text, uuid) from public;
grant execute on function public.reserve_stock(text, jsonb, integer) to anon, authenticated;
grant execute on function public.release_stock(text) to anon, authenticated;
grant execute on function public.consume_stock_reservation(text, uuid) to authenticated;
revoke all on function public.cleanup_expired_stock_reservations() from public;
grant execute on function public.cleanup_expired_stock_reservations() to service_role;

create or replace function public.record_inventory_adjustment(
  p_product_id uuid,
  p_batch_number text,
  p_expiry_date date,
  p_quantity integer,
  p_movement_type text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_available integer;
begin
  if not public.inventory_product_is_owned(p_product_id) then
    raise exception 'Not allowed';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;
  if p_movement_type not in ('receipt', 'damage', 'expiry', 'adjustment') then
    raise exception 'Invalid movement type';
  end if;
  if nullif(trim(p_batch_number), '') is null then
    raise exception 'Batch number is required';
  end if;

  insert into public.inventory_batches (product_id, batch_number, expiry_date, received_quantity, available_quantity, status)
  values (p_product_id, trim(p_batch_number), p_expiry_date, case when p_movement_type = 'receipt' then p_quantity else 0 end, case when p_movement_type = 'receipt' then p_quantity else 0 end, 'active')
  on conflict (product_id, batch_number) do update set
    expiry_date = coalesce(excluded.expiry_date, inventory_batches.expiry_date),
    updated_at = now()
  returning id, available_quantity into v_batch_id, v_available;

  if p_movement_type = 'receipt' then
    update public.inventory_batches set received_quantity = received_quantity + p_quantity, available_quantity = available_quantity + p_quantity, status = 'active', updated_at = now() where id = v_batch_id;
    update public.products set stock_quantity = stock_quantity + p_quantity, is_available = true, updated_at = now() where id = p_product_id;
  else
    if v_available < p_quantity then raise exception 'Batch quantity is insufficient'; end if;
    update public.inventory_batches set available_quantity = available_quantity - p_quantity, status = case when available_quantity - p_quantity = 0 then 'depleted' else status end, updated_at = now() where id = v_batch_id;
    update public.products set stock_quantity = greatest(0, stock_quantity - p_quantity), is_available = (stock_quantity - p_quantity) > 0, updated_at = now() where id = p_product_id;
  end if;

  insert into public.inventory_movements (product_id, batch_id, movement_type, quantity, reason, note, actor_id)
  values (p_product_id, v_batch_id, p_movement_type, p_quantity, p_movement_type, p_note, auth.uid());
  return jsonb_build_object('batch_id', v_batch_id, 'quantity', p_quantity);
end;
$$;

revoke all on function public.record_inventory_adjustment(uuid, text, date, integer, text, text) from public;
grant execute on function public.record_inventory_adjustment(uuid, text, date, integer, text, text) to authenticated;

notify pgrst, 'reload schema';
