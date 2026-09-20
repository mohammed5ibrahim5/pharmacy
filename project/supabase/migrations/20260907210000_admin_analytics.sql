-- ============================================================
-- 20260907210000 — لوحة التحليل + السجل الإداري
--   1) page_views        : سجل زيارات صفحات المتجر (التحويل = إنشاء طلب)
--   2) admin_audit_log   : سجل كامل لكل تعديل إداري (يكتب آلياً)
--   3) coupon_id         : أعمدة كوبون على order_groups لكل استخدام قادم
--   4) admin_get_analytics(): RPC يعيد كل مقاييس اللوحة في jsonb واحد
-- ============================================================

-- ------------------------------------------------------------
-- 1) زيارة صفحة: كل زيارة تُسجَّل بدون بيانات حساسة
-- ------------------------------------------------------------
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  path text not null,
  referrer text,
  user_agent text,
  session_id text,
  created_at timestamptz not null default now()
);

alter table public.page_views enable row level security;

-- الإدراج متاح للجميع (زيارات المتجر) — القراءة للأدمن فقط
drop policy if exists "page_views_insert_all" on public.page_views;
create policy "page_views_insert_all" on public.page_views
  for insert to anon, authenticated
  with check (true);

drop policy if exists "page_views_select_admin" on public.page_views;
create policy "page_views_select_admin" on public.page_views
  for select to authenticated
  using (public.is_site_admin());

grant select, insert on public.page_views to anon, authenticated;
grant usage, select on sequence public.page_views_id_seq to anon, authenticated;

-- ------------------------------------------------------------
-- 2) السجل الإداري: يُكتب آلياً عبر trigger على الجداول التشغيلية
-- ------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_email text,
  action text not null,
  entity_table text not null,
  entity_id text,
  summary text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit_log_select_admin" on public.admin_audit_log;
create policy "admin_audit_log_select_admin" on public.admin_audit_log
  for select to authenticated
  using (public.is_site_admin());

grant select on public.admin_audit_log to authenticated;

-- ------------------------------------------------------------
-- 3) أعمدة كوبون على order_groups لاستخدام/أرباح الكوبونات
-- ------------------------------------------------------------
alter table public.order_groups add column if not exists coupon_id uuid references public.coupons(id) on delete set null;
alter table public.order_groups add column if not exists coupon_discount numeric(10,2) not null default 0;

-- ------------------------------------------------------------
-- 4) دالة تطبيع نص البحث (تطابق الكلمات العربية/الإنجليزية)
-- ------------------------------------------------------------
create or replace function public.normalize_search(v text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               lower(translate(coalesce(v,''), 'أإآىة', 'ااايا')),
               '[ًٌٍَُِّْ]', '', 'g'),
             '[^0-9a-z\u0600-\u06FF ]', '', 'g'),
           '\s+', ' ', 'g');
$$;

-- ------------------------------------------------------------
-- 5) Trigger سجل إداري عام: يُسجّل إنشـاء/تعديل/حذف من الأدمن فقط
-- ------------------------------------------------------------
create or replace function public.fn_admin_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin text;
  v_eid text;
  v_new jsonb;
  v_old jsonb;
  v_diff jsonb := '{}'::jsonb;
  v_row record;
  v_old_val text;
  v_summary text;
  v_details jsonb;
begin
  -- نسجل فقط تعديلات الأدمن (العميل العادي لا يُسجَّل)
  if not public.is_site_admin() then
    return null;
  end if;

  select email into v_admin from public.customers where id = auth.uid();

  begin
    if tg_op = 'DELETE' then
      v_eid := (old.id)::text;
    else
      v_eid := (new.id)::text;
    end if;
  exception when others then
    v_eid := null;
  end;

  v_new := to_jsonb(new);
  v_old := to_jsonb(old);

  if tg_op = 'UPDATE' then
    for v_row in select key, value from jsonb_each(v_new) loop
      v_old_val := (v_old -> v_row.key)::text;
      if coalesce(v_row.value::text, '<null>') is distinct from coalesce(v_old_val, '<null>') then
        v_diff := jsonb_set(v_diff, array[v_row.key], jsonb_build_object('old', v_old -> v_row.key, 'new', v_row.value));
      end if;
    end loop;
    v_summary := 'تعديل ' || tg_table_name;
    v_details := v_diff;
  elsif tg_op = 'INSERT' then
    v_summary := 'إنشاء ' || tg_table_name;
    v_details := jsonb_build_object('row', v_new);
  else
    v_summary := 'حذف ' || tg_table_name;
    v_details := jsonb_build_object('row', v_old);
  end if;

  insert into public.admin_audit_log (admin_email, action, entity_table, entity_id, summary, details)
  values (v_admin, tg_table_name || '.' || lower(tg_op), tg_table_name, v_eid, v_summary, v_details);

  return null;
exception when others then
  -- لا نوقف العملية الأصلية أبداً إذا فشل التسجيل
  return null;
end;
$$;

-- ربط الـ trigger على الجداول الإدارية التشغيلية
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'orders','order_groups','products','pharmacies','categories',
    'discounts','coupons','customers','prescriptions',
    'chronic_subscriptions','site_settings','loyalty_transactions'
  ] loop
    execute format('drop trigger if exists trg_admin_audit_%s on public.%I', v_table, v_table);
    execute format(
      'create trigger trg_admin_audit_%s
         after insert or update or delete on public.%I
         for each row execute function public.fn_admin_audit_trigger()',
      v_table, v_table);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 6) RPC التحليلات: يعيد كل المقاييس دفعة واحدة (الأدمن فقط)
-- ------------------------------------------------------------
create or replace function public.admin_get_analytics(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_site_admin() then
    return null;
  end if;

  select jsonb_build_object(
    'range_days', p_days,
    'generated_at', now(),

    'visits', jsonb_build_object(
      'total', (select count(*) from public.page_views),
      'today', (select count(*) from public.page_views where created_at >= date_trunc('day', now())),
      'prev_week', (select count(*) from public.page_views where created_at >= date_trunc('day', now()) - interval '13 days' and created_at < date_trunc('day', now()) - interval '6 days'),
      'last7', coalesce((
        select jsonb_agg(jsonb_build_object('day', day, 'count', cnt) order by day) from (
          select to_char(date_trunc('day', created_at), 'MM-DD') as day, count(*) as cnt
          from public.page_views
          where created_at >= date_trunc('day', now()) - interval '6 days'
          group by 1
        ) v), '[]'::jsonb)
    ),

    'conversions', jsonb_build_object(
      'total', (select count(*) from public.order_groups),
      'today', (select count(*) from public.order_groups where created_at >= date_trunc('day', now())),
      'prev_week', (select count(*) from public.order_groups where created_at >= date_trunc('day', now()) - interval '13 days' and created_at < date_trunc('day', now()) - interval '6 days'),
      'last7', coalesce((
        select jsonb_agg(jsonb_build_object('day', day, 'count', cnt) order by day) from (
          select to_char(date_trunc('day', created_at), 'MM-DD') as day, count(*) as cnt
          from public.order_groups
          where created_at >= date_trunc('day', now()) - interval '6 days'
          group by 1
        ) v), '[]'::jsonb)
    ),

    'searched', coalesce((
      select jsonb_agg(jsonb_build_object(
               'keyword', s.keyword, 'search_count', s.search_count,
               'product_name', best.name, 'purchased', best.purchased
             ) order by s.search_count desc)
      from (
        select keyword, search_count
        from public.search_keywords
        order by search_count desc
        limit 15
      ) s
      cross join lateral (
        select p.name,
               exists (
                 select 1 from public.orders o
                 where o.product_id = p.id and o.status <> 'cancelled'
               ) as purchased
        from public.products p
        where public.normalize_search(p.name) = public.normalize_search(s.keyword)
           or public.normalize_search(coalesce(p.name_en,'')) = public.normalize_search(s.keyword)
           or public.normalize_search(coalesce(p.active_ingredient,'')) = public.normalize_search(s.keyword)
           or public.normalize_search(p.name) like '%' || public.normalize_search(s.keyword) || '%'
        order by purchased asc, p.name
        limit 1
      ) best
    ), '[]'::jsonb),

    'cancellation', (
      select jsonb_build_object(
        'total', count(*),
        'cancelled', count(*) filter (where status = 'cancelled'),
        'by_status', coalesce(
          (select jsonb_object_agg(status, cnt) from (
             select status, count(*) as cnt from public.order_groups group by status
           ) st), '{}'::jsonb)
      ) from public.order_groups
    ),

    'pharmacies', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', coalesce(ph.id::text, ''),
               'name', coalesce(ph.name, 'صيدلية محذوفة'),
               'orders', count(*) filter (where o.status <> 'cancelled'),
               'revenue', coalesce(sum(o.total_price) filter (where o.status <> 'cancelled'), 0),
               'cancelled', count(*) filter (where o.status = 'cancelled')
             ) order by sum(o.total_price) filter (where o.status <> 'cancelled') desc nulls last)
      from public.orders o
      left join public.pharmacies ph on ph.id = o.pharmacy_id
      where o.created_at >= now() - make_interval(days => p_days)
      group by ph.id, ph.name
    ), '[]'::jsonb),

    'revenue', jsonb_build_object(
      'loyalty_count', (select count(*) from public.order_groups where loyalty_discount > 0),
      'loyalty_total', (select coalesce(sum(loyalty_discount), 0) from public.order_groups where loyalty_discount > 0),
      'sub_active', (select count(*) from public.chronic_subscriptions where active = true),
      'sub_orders', (select count(*) from public.order_groups where subscription_id is not null and status <> 'cancelled'),
      'sub_revenue', (select coalesce(sum(total_price), 0) from public.order_groups where subscription_id is not null and status <> 'cancelled'),
      'coupon_issued', (select count(*) from public.coupons),
      'coupon_active', (select count(*) from public.coupons where is_active = true),
      'coupon_used', (select count(*) from public.order_groups where coupon_id is not null),
      'coupon_discount', (select coalesce(sum(coupon_discount), 0) from public.order_groups where coupon_id is not null)
    ),

    'audit', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', id, 'admin_email', admin_email, 'action', action,
               'entity_table', entity_table, 'entity_id', entity_id,
               'summary', summary, 'created_at', created_at
             ) order by created_at desc)
      from (
        select id, admin_email, action, entity_table, entity_id, summary, created_at
        from public.admin_audit_log
        order by created_at desc
        limit 40
      ) a
    ), '[]'::jsonb)

  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_get_analytics(int) from public;
grant execute on function public.admin_get_analytics(int) to authenticated;

notify pgrst, 'reload schema';