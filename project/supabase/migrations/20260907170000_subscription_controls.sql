-- Subscription controls, renewal history, reminders, and low-stock notices.

alter table public.chronic_subscriptions
  add column if not exists renewal_reminder_days integer not null default 3 check (renewal_reminder_days between 0 and 14),
  add column if not exists last_reminder_for timestamptz,
  add column if not exists renewal_count integer not null default 0 check (renewal_count >= 0),
  add column if not exists paused_at timestamptz;

alter table public.order_groups
  add column if not exists subscription_id uuid references public.chronic_subscriptions(id) on delete set null;

create index if not exists order_groups_subscription_created_idx
  on public.order_groups (subscription_id, created_at desc);

create table if not exists public.subscription_stock_notices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.chronic_subscriptions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  stock_quantity integer not null,
  reorder_level integer not null,
  created_at timestamptz not null default now(),
  unique (subscription_id, product_id)
);

alter table public.subscription_stock_notices enable row level security;
drop policy if exists subscription_stock_notices_select_own on public.subscription_stock_notices;
create policy subscription_stock_notices_select_own on public.subscription_stock_notices for select to authenticated
  using (exists (select 1 from public.chronic_subscriptions s where s.id = subscription_id and (s.customer_id = auth.uid() or public.is_site_admin())));

create or replace function public.send_subscription_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_sent integer := 0;
begin
  for v_row in
    select s.id, s.customer_id, s.product_id, s.next_run_at, s.renewal_reminder_days, p.name
      from public.chronic_subscriptions s
      join public.products p on p.id = s.product_id
     where s.active = true
       and s.next_run_at <= now() + make_interval(days => s.renewal_reminder_days)
       and s.next_run_at > now()
       and (s.last_reminder_for is null or s.last_reminder_for < s.next_run_at)
  loop
    insert into public.notifications (customer_id, type, title, body, read)
    values (v_row.customer_id, 'subscription', 'تذكير بتجديد الاشتراك', 'سيتم تجديد اشتراك ' || v_row.name || ' قريباً.', false);
    update public.chronic_subscriptions set last_reminder_for = next_run_at, updated_at = now() where id = v_row.id;
    v_sent := v_sent + 1;
  end loop;
  return jsonb_build_object('sent', v_sent);
end;
$$;

create or replace function public.notify_subscription_low_stock()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_sent integer := 0;
begin
  for v_row in
    select s.id, s.customer_id, s.product_id, p.name, p.stock_quantity, p.reorder_level
      from public.chronic_subscriptions s
      join public.products p on p.id = s.product_id
     where s.active = true
       and p.stock_quantity <= coalesce(p.reorder_level, 5)
       and not exists (select 1 from public.subscription_stock_notices n where n.subscription_id = s.id and n.product_id = s.product_id)
  loop
    insert into public.subscription_stock_notices (subscription_id, product_id, stock_quantity, reorder_level)
    values (v_row.id, v_row.product_id, v_row.stock_quantity, coalesce(v_row.reorder_level, 5));
    insert into public.notifications (customer_id, type, title, body, read)
    values (v_row.customer_id, 'subscription', 'تنبيه مخزون الاشتراك', 'مخزون ' || v_row.name || ' منخفض وقد يتأثر التجديد القادم.', false);
    v_sent := v_sent + 1;
  end loop;
  return jsonb_build_object('sent', v_sent);
end;
$$;

create or replace function public.update_subscription_schedule(
  p_subscription_id uuid,
  p_next_run_at timestamptz,
  p_reminder_days integer,
  p_payment_method text
)
returns public.chronic_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare v_result public.chronic_subscriptions;
begin
  if p_next_run_at <= now() then raise exception 'Next renewal must be in the future'; end if;
  if p_reminder_days < 0 or p_reminder_days > 14 then raise exception 'Invalid reminder window'; end if;
  if p_payment_method not in ('cash_on_delivery', 'vodafone_cash', 'instapay') then raise exception 'Invalid subscription payment method'; end if;
  update public.chronic_subscriptions
     set next_run_at = p_next_run_at, renewal_reminder_days = p_reminder_days,
         payment_method = p_payment_method, last_reminder_for = null,
         updated_at = now()
   where id = p_subscription_id and customer_id = auth.uid()
   returning * into v_result;
  if v_result.id is null then raise exception 'Subscription not found'; end if;
  return v_result;
end;
$$;

revoke all on function public.send_subscription_reminders() from public;
revoke all on function public.notify_subscription_low_stock() from public;
revoke all on function public.update_subscription_schedule(uuid, timestamptz, integer, text) from public;
grant execute on function public.send_subscription_reminders() to service_role;
grant execute on function public.notify_subscription_low_stock() to service_role;
grant execute on function public.update_subscription_schedule(uuid, timestamptz, integer, text) to authenticated;
notify pgrst, 'reload schema';
