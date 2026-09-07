-- ============================================================
-- 20260908000000 — إصلاح دالة is_site_admin()
-- المشكلة: 20260831000000 استبدلت الدالة بمطابقة على عمود
-- site_admins.user_id وهو غير موجود في الجدول (فيه email فقط)
-- → الدالة ترجع false دائماً → "غير مصرح" لكل صفحات الأدمن.
-- الحل: تطابق آمن عبر البريد (auth.jwt) مع دعم user_id لو وُجد.
-- ============================================================

create or replace function public.is_site_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  -- 1) لو جدول site_admins يحتوي عمود user_id (إصدارات أحدث) فطابق به
  begin
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'site_admins' and column_name = 'user_id'
    ) and v_uid is not null and exists (
      select 1 from public.site_admins where user_id = v_uid
    ) then
      return true;
    end if;
  exception when others then
    null;
  end;

  -- 2) المطابقة الأساسية عبر البريد (الجدول الحالي: email فقط)
  if v_email is not null and v_email <> '' and exists (
    select 1 from public.site_admins where lower(email) = v_email
  ) then
    return true;
  end if;

  return false;
exception when others then
  return false;
end;
$$;

notify pgrst, 'reload schema';