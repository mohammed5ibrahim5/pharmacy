-- ============================================================
-- نظام التحقق الاحترافي من الروشتات (8 خطوات)
-- Professional prescription verification pipeline
-- ============================================================

-- ------------------------------------------------------------
-- 1) أعمدة خط الأنابيب على جدول prescriptions
-- ------------------------------------------------------------
alter table public.prescriptions
  add column if not exists patient_name text,
  add column if not exists image_hash text,
  add column if not exists data_hash text,
  add column if not exists ocr_status text default 'pending'
    check (ocr_status in ('pending','processing','passed','failed')),
  add column if not exists ocr_data jsonb default '{}'::jsonb,
  add column if not exists validity_status text default 'unknown'
    check (validity_status in ('unknown','valid','expired','invalid_date')),
  add column if not exists duplicate_status text default 'unknown'
    check (duplicate_status in ('unknown','clear','suspected')),
  add column if not exists duplicate_of uuid references public.prescriptions(id),
  add column if not exists risk_level text default 'normal'
    check (risk_level in ('normal','restricted','narcotic')),
  add column if not exists delivery_mode text default 'delivery'
    check (delivery_mode in ('delivery','pickup_only')),
  add column if not exists pipeline_status text default 'pending_ocr'
    check (pipeline_status in ('pending_ocr','auto_rejected','needs_review','clarification_requested','approved','rejected','dispensed')),
  add column if not exists review_notes text,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists reference_code text unique,
  add column if not exists order_group_id uuid references public.order_groups(id),
  add column if not exists dispensed_at timestamptz,
  add column if not exists dispensed_pharmacy_id uuid references public.pharmacies(id),
  add column if not exists recipient_national_id text,
  add column if not exists identity_verified boolean default false,
  add column if not exists delivered_at timestamptz,
  add column if not exists delivered_by text;

create index if not exists prescriptions_image_hash_idx on public.prescriptions (image_hash);
create index if not exists prescriptions_data_hash_idx on public.prescriptions (data_hash);
create index if not exists prescriptions_pipeline_status_idx on public.prescriptions (pipeline_status);
create index if not exists prescriptions_customer_idx on public.prescriptions (customer_id);

-- مزامنة عمود status القديم مع pipeline_status للتوافق مع الكود الحالي
create or replace function public.sync_prescription_legacy_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := case new.pipeline_status
    when 'approved' then 'preparing'::text
    when 'dispensed' then 'completed'::text
    when 'rejected' then 'cancelled'::text
    when 'auto_rejected' then 'cancelled'::text
    else 'reviewing'::text
  end;
  return new;
end;
$$;

drop trigger if exists prescriptions_sync_legacy_status on public.prescriptions;
create trigger prescriptions_sync_legacy_status
  before insert or update of pipeline_status on public.prescriptions
  for each row execute function public.sync_prescription_legacy_status();

-- ------------------------------------------------------------
-- 2) سجل نقابة الأطباء (للتحقق من ترخيص الطبيب)
-- ------------------------------------------------------------
create table if not exists public.doctor_registry (
  id uuid primary key default gen_random_uuid(),
  syndicate_no text not null unique,
  doctor_name text not null,
  specialty text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.doctor_registry enable row level security;

drop policy if exists "doctors read for authenticated" on public.doctor_registry;
create policy "doctors read for authenticated"
  on public.doctor_registry for select to authenticated using (true);

drop policy if exists "doctors admin write" on public.doctor_registry;
create policy "doctors admin write"
  on public.doctor_registry for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());

-- ------------------------------------------------------------
-- 3) سجل تدقيق كل إجراء على الروشتة (Audit trail)
-- ------------------------------------------------------------
create table if not exists public.prescription_audit_log (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  actor_type text not null check (actor_type in ('system','admin','customer')),
  action text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rx_audit_rx_idx on public.prescription_audit_log (prescription_id, created_at);

alter table public.prescription_audit_log enable row level security;

drop policy if exists "rx audit admin read" on public.prescription_audit_log;
create policy "rx audit admin read"
  on public.prescription_audit_log for select to authenticated
  using (public.is_site_admin());

drop policy if exists "rx audit insert" on public.prescription_audit_log;
create policy "rx audit insert"
  on public.prescription_audit_log for insert to authenticated
  with check (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_id
        and (p.customer_id = auth.uid() or public.is_site_admin())
    )
  );

-- ------------------------------------------------------------
-- 4) تشديد سياسات جدول prescriptions
--    (الرفع يتطلب حساب موثق — لا مزيد من الروشتات المجهولة)
-- ------------------------------------------------------------
drop policy if exists "prescriptions_insert_own" on public.prescriptions;
create policy "prescriptions_insert_own"
  on public.prescriptions for insert to authenticated
  with check (customer_id = auth.uid());

-- ------------------------------------------------------------
-- 5) تخزين الروشتات: الرفع لملك المجلد فقط
--    (البوكيت خاص بالفعل منذ migration 20260818)
-- ------------------------------------------------------------
drop policy if exists "prescriptions_storage_upload" on storage.objects;
create policy "prescriptions_storage_upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'prescriptions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
