-- ============================================================
-- Global search keyword counter for the "Most requested" bar
-- Run in Supabase SQL Editor.
-- ============================================================

create table if not exists public.search_keywords (
  keyword text primary key,
  search_count bigint not null default 0,
  last_searched_at timestamptz not null default now()
);

-- دالة زيادة العداد (upsert) تُستدعى من التطبيق عند كل بحث
create or replace function public.increment_search_keyword(p_keyword text)
returns void
language sql
as $$
  insert into public.search_keywords (keyword, search_count, last_searched_at)
  values (p_keyword, 1, now())
  on conflict (keyword)
  do update set search_count = public.search_keywords.search_count + 1,
                last_searched_at = now();
$$;

-- ============ RLS: هذا الجدول عدّاد عام غير حساس ============
alter table public.search_keywords enable row level security;

drop policy if exists "search_keywords_select_all" on public.search_keywords;
create policy "search_keywords_select_all" on public.search_keywords
  for select using (true);

drop policy if exists "search_keywords_insert_all" on public.search_keywords;
create policy "search_keywords_insert_all" on public.search_keywords
  for insert with check (true);

drop policy if exists "search_keywords_update_all" on public.search_keywords;
create policy "search_keywords_update_all" on public.search_keywords
  for update using (true) with check (true);

grant execute on function public.increment_search_keyword(text) to anon, authenticated;
grant select, insert, update on public.search_keywords to anon, authenticated;
