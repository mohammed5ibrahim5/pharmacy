-- ------------------------------------------------------------
-- 20260827000000_harden_prescription_self_update.sql
-- إغلاق ثغرة التحقق الذاتي: منع العميل من تغيير حالة الروشتة
-- لنفسه إلى "approved"/"rejected"/"dispensed" أو كتابة reference_code
-- أو ربط طلب بنفسه. هذه التحولات الحساسة تصبح حصرية لسياسات
-- الأدمن (prescriptions_update_admin) فقط.
--
-- العميل يبقى قادراً على تحديث أعمدة خط الأنابيب الآلية الآمنة
-- (ocr_*, data_hash, validity_status, duplicate_*, risk_level,
--  delivery_mode, notes, image_url, rejection_reason) وتغيير الحالة
-- فقط ضمن الحالات غير الحاسمة: pending_ocr / needs_review /
-- clarification_requested / auto_rejected.
-- ------------------------------------------------------------

-- نخفض سياسة العميل أولاً، ثم نعيد بناءها مثبّتة.
drop policy if exists "prescriptions_update_own" on public.prescriptions;

-- العميل/مالك الروشتة: يقدر يحدّث أعمدة الفحص الآلي فقط،
-- ولا يجوز له كتابة حالة حاسمة أو مرجع أو ربط طلب.
-- (الأدمن يظل محكوم بسياسة prescriptions_update_admin المنفصلة؛
--  وهنا نسمح له صراحةً حتى لو كانت الوصفة تخصه هو نفسه.)
create policy "prescriptions_update_own"
  on public.prescriptions for update to authenticated
  using (
    customer_id = auth.uid()
  )
  with check (
    customer_id = auth.uid()
    and (
      public.is_site_admin()
      or pipeline_status in ('pending_ocr', 'needs_review', 'clarification_requested', 'auto_rejected')
    )
  );

-- ------------------------------------------------------------------
-- 2) طبقة دفاع إضافية في قاعدة البيانات: trigger يرفض كتابة حالة
--    حاسمة إلا إذا كان المستخدم أدمن (security definer for admin).
--    (يمنع حتى عبث UPDATE المباشر على مستوى الجدول)
-- ------------------------------------------------------------------
create or replace function public.guard_rx_terminal_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_rpc boolean := coalesce(nullif(current_setting('rx.link_from_order', true), ''), 'off') = 'on';
begin
  -- التحويلات الحاسمة تنجح فقط عبر أدمن (pipeline_status/reference_code/)
  if new.pipeline_status in ('approved', 'rejected', 'dispensed')
     or new.reference_code is distinct from old.reference_code
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.dispensed_at is distinct from old.dispensed_at
     or new.dispensed_pharmacy_id is distinct from old.dispensed_pharmacy_id
     or new.dispensed_by is distinct from old.dispensed_by
     -- ربط الطلب مسموح عبر RPC الآمن فقط، أو للأدمن
     or (new.order_group_id is distinct from old.order_group_id and not v_from_rpc)
  then
    -- يسمح فقط للمستخدم الذي تسجيله الحالي مؤكد كأدمن.
    -- (الـ trigger security definer يعمل بـ RLS محيطي، لكن auth.uid()
    --  يعود للمستخدم الأصلي للطلب → لا يمكن للعميل تزوير الحالة.)
    if not public.is_site_admin() then
      raise exception 'غير مصرح لك بتغيير حالة الروشتة هذه.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_rx_terminal_status on public.prescriptions;
create trigger guard_rx_terminal_status
  before update on public.prescriptions
  for each row execute function public.guard_rx_terminal_status();

-- ------------------------------------------------------------------
-- 3) RPC آمن لربط الروشتة بطلب: العميل لا يكتب order_group_id
--    مباشرة أبداً؛ يتم الربط عبر دالة تتحقق أن:
--      - الروشتة مملوكة للمستخدم وعمود الـ pipeline_status = 'approved'
--      - مجموعة الطلب مملوكة للمستخدم فعلاً (العملية للعميل نفسه)
--      - الروشتة غير مربوطه بالفعل بطلب آخر
--      - كل دواء في السلة يحتاج وصفة مطابق لدواء الروشتة
--        (ocr_data.drug_name) — المصادقة الصارمة على المطابقة
-- ------------------------------------------------------------------
create or replace function public.link_rx_to_order_group(
  p_rx_id uuid,
  p_order_group_id uuid,
  p_product_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid := auth.uid();
  v_rx_status text;
  v_rx_customer uuid;
  v_link uuid;
  v_og_customer uuid;
  v_rx_drug text;
  v_issue text;
  v_risk text;
  v_prod record;
  v_norm_rx text;
  v_norm_prod text;
  v_max_days int;
  v_issued timestamptz;
  v_days_old int;
begin
  if v_customer is null then
    raise exception 'يجب تسجيل الدخول أولاً.';
  end if;

  select pipeline_status, customer_id, order_group_id,
         lower(ocr_data ->> 'drug_name'),
         ocr_data ->> 'issue_date',
         risk_level
    into v_rx_status, v_rx_customer, v_link, v_rx_drug, v_issue, v_risk
    from public.prescriptions
   where id = p_rx_id
   for update;

  if v_rx_status is null then
    raise exception 'الوصفة غير موجودة.';
  end if;
  if v_rx_customer is distinct from v_customer then
    raise exception 'هذه الوصفة لا تخصك.';
  end if;
  if v_rx_status <> 'approved' then
    raise exception 'يجب أن تكون الوصفة معتمدة قبل ربطها بطلب.';
  end if;
  if v_link is not null then
    raise exception 'هذه الوصفة مرتبطة بطلب آخر بالفعل.';
  end if;

  -- إعادة التحقق من صلاحية الوصفة عند الربط (90 يوم عادي / 30 يوم مقيد)
  if v_issue is not null and v_issue <> '' then
    begin
      v_issued := (v_issue || 'T00:00:00')::timestamptz;
    exception when others then
      v_issued := null; -- تاريخ غير صالح من OCR → لا نحسب صلاحية
    end;
    if v_issued is not null then
      v_max_days := case when v_risk = 'restricted' or v_risk = 'narcotic' then 30 else 90 end;
      v_days_old := floor(extract(epoch from (now() - v_issued)) / 86400)::int;
      if v_days_old > v_max_days then
        raise exception 'انتهت صلاحية الوصفة، يجب تجديدها قبل إتمام الطلب.';
      end if;
    end if;
  end if;

  -- تحقق من مطابقة الدواء: كل منتج يحتاج وصفة يجب أن يطابق دواء الروشتة
  if p_product_ids is not null and cardinality(p_product_ids) > 0 then
    v_norm_rx := public.normalize_med_name(v_rx_drug);
    if v_norm_rx is null or v_norm_rx = '' then
      raise exception 'الروشتة لا تحوي اسماً صريحاً للدواء، لا يمكن تأكيد المطابقة.';
    end if;

    for v_prod in
      select id, lower(name) as name, name_en
      from public.products
      where id = any(p_product_ids)
        and requires_prescription = true
    loop
      v_norm_prod := public.normalize_med_name(v_prod.name);
      v_norm_prod := coalesce(nullif(v_norm_prod, ''), public.normalize_med_name(v_prod.name_en));

      if v_norm_prod <> v_norm_rx
         and position(v_norm_rx in v_norm_prod) = 0
         and position(v_norm_prod in v_norm_rx) = 0 then
        raise exception 'الدواء المطلوب غير مطابق للروشتة المعتمدة.';
      end if;
    end loop;
  end if;

  -- تأكد أن مجموعة الطلب تخص نفس العميل (يمنع ربط وصفة بطلب غريب)
  select customer_id into v_og_customer
    from public.order_groups
   where id = p_order_group_id
   for update;

  if v_og_customer is distinct from v_customer then
    raise exception 'مجموعة الطلب لا تخصك.';
  end if;

  -- شغّل تحديث ربط الطلب دون أن يمنعه حارس الحالات، لأن هذه الوظيفة
  -- نفسها تحققت من الملكية والحالة والنقص والمطابقة. (local = يتراجع)
  perform set_config('rx.link_from_order', 'on', true);

  update public.prescriptions
     set order_group_id = p_order_group_id
   where id = p_rx_id;

  insert into public.prescription_audit_log (prescription_id, actor_type, action, details)
  values (p_rx_id, 'customer', 'linked_to_order', jsonb_build_object('order_group_id', p_order_group_id, 'products', p_product_ids));
end;
$$;

-- أداة تطبيع اسم الدواء للمقارنة (ضبط الهمزات + إزالة الفراغات والرموز)
-- صياغة آمنة متوافقة مع PostgreSQL (بدون escape \u)
create or replace function public.normalize_med_name(p_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select upper(regexp_replace(
    translate(coalesce(p_name, ''), 'أإآىةؤئ', 'ااايءءه'),
    '[\s.,;:\(\)\[\]\/_\-+*?!]', '', 'g'
  ))
$$;

revoke all on function public.link_rx_to_order_group(uuid, uuid, uuid[]) from public;
grant execute on function public.link_rx_to_order_group(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.normalize_med_name(text) to authenticated;
