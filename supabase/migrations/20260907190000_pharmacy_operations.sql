-- Pharmacy operations: staff roles, acceptance SLA, substitutions, and reports.

alter table public.orders add column if not exists acceptance_deadline timestamptz default (now() + interval '15 minutes');
alter table public.orders add column if not exists accepted_at timestamptz;
alter table public.orders add column if not exists accepted_by uuid;

create table if not exists public.pharmacy_staff (
  id uuid primary key references auth.users(id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'pharmacist' check (role in ('owner', 'manager', 'pharmacist', 'cashier')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.order_substitution_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  original_product_id uuid not null references public.products(id),
  proposed_product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  proposed_price numeric not null check (proposed_price >= 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  requested_by uuid not null default auth.uid(),
  customer_responded_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.current_owner_pharmacy_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select pharmacy_id from public.pharmacy_owners where id = auth.uid() and is_active limit 1),
    (select pharmacy_id from public.pharmacy_staff where id = auth.uid() and is_active limit 1)
  );
$$;

alter table public.pharmacy_staff enable row level security;
alter table public.order_substitution_requests enable row level security;
drop policy if exists pharmacy_staff_owner_manage on public.pharmacy_staff;
create policy pharmacy_staff_owner_manage on public.pharmacy_staff for all to authenticated using (pharmacy_id = public.current_owner_pharmacy_id() or id = auth.uid() or public.is_site_admin()) with check (pharmacy_id = public.current_owner_pharmacy_id() or public.is_site_admin());
drop policy if exists substitution_customer_read on public.order_substitution_requests;
create policy substitution_customer_read on public.order_substitution_requests for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()) or public.is_site_admin());
drop policy if exists substitution_staff_manage on public.order_substitution_requests;
create policy substitution_staff_manage on public.order_substitution_requests for all to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.pharmacy_id = public.current_owner_pharmacy_id()) or public.is_site_admin()) with check (exists (select 1 from public.orders o where o.id = order_id and o.pharmacy_id = public.current_owner_pharmacy_id()) or public.is_site_admin());

create or replace function public.accept_pharmacy_order(p_order_id uuid, p_accept boolean)
returns public.orders language plpgsql security definer set search_path = public as $$
declare v_order public.orders;
begin
  update public.orders set status = case when p_accept then 'confirmed' else 'cancelled' end, accepted_at = now(), accepted_by = auth.uid(), updated_at = now()
   where id = p_order_id and pharmacy_id = public.current_owner_pharmacy_id() and status = 'pending' and (acceptance_deadline is null or acceptance_deadline >= now())
   returning * into v_order;
  if v_order.id is null then raise exception 'Order is no longer available for acceptance'; end if;
  return v_order;
end;
$$;

create or replace function public.get_pharmacy_sales_report(p_from timestamptz default now() - interval '30 days', p_to timestamptz default now())
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_result jsonb; v_pharmacy uuid := public.current_owner_pharmacy_id();
begin
  if v_pharmacy is null and not public.is_site_admin() then raise exception 'Not allowed'; end if;
  select jsonb_build_object('orders', count(*) filter (where o.status <> 'cancelled'), 'delivered', count(*) filter (where o.status = 'delivered'), 'revenue', coalesce(sum(o.total_price) filter (where o.status in ('confirmed','shipped','delivered')), 0), 'top_products', coalesce((select jsonb_agg(x order by x.quantity desc) from (select p.name, sum(o2.quantity)::integer quantity, sum(o2.total_price) revenue from public.orders o2 join public.products p on p.id = o2.product_id where (v_pharmacy is null or o2.pharmacy_id = v_pharmacy) and o2.created_at between p_from and p_to and o2.status <> 'cancelled' group by p.id, p.name order by quantity desc limit 10) x), '[]'::jsonb)) into v_result from public.orders o where (v_pharmacy is null or o.pharmacy_id = v_pharmacy) and o.created_at between p_from and p_to;
  return v_result;
end;
$$;

revoke all on function public.accept_pharmacy_order(uuid, boolean) from public;
revoke all on function public.get_pharmacy_sales_report(timestamptz, timestamptz) from public;
grant execute on function public.accept_pharmacy_order(uuid, boolean) to authenticated;
grant execute on function public.get_pharmacy_sales_report(timestamptz, timestamptz) to authenticated;
notify pgrst, 'reload schema';
