-- Family health profiles, medication schedules, interaction context, and consent grants.

alter table public.family_members
  add column if not exists profile_type text not null default 'adult' check (profile_type in ('child', 'adult', 'senior')),
  add column if not exists sex text check (sex in ('male', 'female', 'other')),
  add column if not exists medical_notes text,
  add column if not exists allergies_summary text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.patient_medications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  family_member_id uuid references public.family_members(id) on delete cascade,
  name text not null,
  strength text,
  dose text,
  frequency text,
  started_at date,
  ended_at date,
  active boolean not null default true,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.patient_allergies (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  family_member_id uuid references public.family_members(id) on delete cascade,
  allergen text not null,
  reaction text,
  severity text not null default 'unknown' check (severity in ('unknown', 'mild', 'moderate', 'severe')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.medication_schedules (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  family_member_id uuid references public.family_members(id) on delete cascade,
  medication_id uuid references public.patient_medications(id) on delete cascade,
  medication_name text not null,
  dose text not null,
  time_of_day time not null,
  days smallint[] not null default '{0,1,2,3,4,5,6}',
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pharmacist_access_grants (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  family_member_id uuid references public.family_members(id) on delete cascade,
  pharmacy_id uuid references public.pharmacies(id) on delete cascade,
  scope text[] not null default '{medications,allergies,schedules}',
  status text not null default 'granted' check (status in ('granted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.patient_medications enable row level security;
alter table public.patient_allergies enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.pharmacist_access_grants enable row level security;

create or replace function public.family_member_owned(p_member_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.family_members where id = p_member_id and customer_id = auth.uid());
$$;

create policy patient_medications_own on public.patient_medications for all to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid() and (family_member_id is null or public.family_member_owned(family_member_id)));
create policy patient_allergies_own on public.patient_allergies for all to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid() and (family_member_id is null or public.family_member_owned(family_member_id)));
create policy medication_schedules_own on public.medication_schedules for all to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid() and (family_member_id is null or public.family_member_owned(family_member_id)));
create policy pharmacist_access_grants_own on public.pharmacist_access_grants for all to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid() and (family_member_id is null or public.family_member_owned(family_member_id)));

create or replace function public.grant_pharmacist_profile_access(p_family_member_id uuid, p_pharmacy_id uuid, p_hours integer default 24)
returns public.pharmacist_access_grants language plpgsql security definer set search_path = public as $$
declare v_grant public.pharmacist_access_grants;
begin
  if not public.family_member_owned(p_family_member_id) then raise exception 'Not allowed'; end if;
  insert into public.pharmacist_access_grants (customer_id, family_member_id, pharmacy_id, expires_at)
  values (auth.uid(), p_family_member_id, p_pharmacy_id, now() + make_interval(hours => greatest(1, least(p_hours, 168))))
  returning * into v_grant;
  return v_grant;
end;
$$;

revoke all on function public.family_member_owned(uuid) from public;
revoke all on function public.grant_pharmacist_profile_access(uuid, uuid, integer) from public;
grant execute on function public.family_member_owned(uuid) to authenticated;
grant execute on function public.grant_pharmacist_profile_access(uuid, uuid, integer) to authenticated;
notify pgrst, 'reload schema';
