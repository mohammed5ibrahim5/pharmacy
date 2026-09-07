-- Prescription history per family member and explicit manual-review guard.

alter table public.prescriptions
  add column if not exists family_member_id uuid references public.family_members(id) on delete set null,
  add column if not exists manual_review_required boolean not null default false,
  add column if not exists manual_review_reason text;

create index if not exists prescriptions_customer_family_created_idx
  on public.prescriptions (customer_id, family_member_id, created_at desc);

create or replace function public.guard_sensitive_prescription_approval()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.pipeline_status = 'approved'
     and new.risk_level in ('restricted', 'narcotic')
     and (new.reviewed_by is null or new.reviewed_at is null) then
    raise exception 'Sensitive prescriptions require documented pharmacist review before approval';
  end if;
  return new;
end;
$$;

drop trigger if exists prescriptions_sensitive_approval_guard on public.prescriptions;
create trigger prescriptions_sensitive_approval_guard
  before insert or update of pipeline_status, risk_level, reviewed_by, reviewed_at
  on public.prescriptions
  for each row execute function public.guard_sensitive_prescription_approval();

notify pgrst, 'reload schema';
