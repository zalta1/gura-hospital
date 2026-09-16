-- Gura Hospital Admin + Doctor portal schema (local Supabase)
-- Roles: admin, doctor, staff, patient

create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.app_role as enum ('admin', 'doctor', 'staff', 'patient');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.pipeline_stage as enum ('pending_intake', 'navigator_matched', 'confirmed', 'completed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.visit_type as enum ('in_person', 'telehealth');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.reminder_channel as enum ('cold_call', 'sms', 'whatsapp', 'app');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.reminder_status as enum ('pending', 'sent', 'completed', 'failed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.followup_status as enum ('scheduled', 'completed', 'escalated');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.billing_status as enum ('pending', 'paid', 'denied', 'insurance_review');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ai_activity_type as enum ('voice_navigator', 'medication_reminder', 'wellness_check');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ai_activity_outcome as enum ('completed', 'no_answer', 'escalated');
exception when duplicate_object then null;
end $$;

-- Profiles linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  role public.app_role not null default 'patient',
  created_at timestamptz not null default now()
);

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  name text not null,
  specialty text not null default 'Primary Care',
  office text,
  phone text,
  on_shift boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  dob date,
  email text,
  phone text,
  address text,
  insurance text,
  assigned_doctor_id uuid references public.doctors (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  doctor_id uuid not null references public.doctors (id) on delete restrict,
  datetime timestamptz not null,
  status public.appointment_status not null default 'pending',
  pipeline_stage public.pipeline_stage not null default 'pending_intake',
  reason_for_visit text,
  visit_type public.visit_type not null default 'in_person',
  campus text not null default 'Fairmont Ridge',
  created_at timestamptz not null default now()
);

create table if not exists public.patient_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  doctor_id uuid not null references public.doctors (id) on delete restrict,
  appointment_id uuid references public.appointments (id) on delete set null,
  diagnosis text,
  notes text,
  vitals jsonb not null default '{}'::jsonb,
  ai_drafted boolean not null default false,
  approved_by_doctor boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.medication_plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  doctor_id uuid not null references public.doctors (id) on delete restrict,
  drug_name text not null,
  dose text not null,
  schedule text not null,
  duration text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_reminders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  medication_plan_id uuid references public.medication_plans (id) on delete set null,
  scheduled_time timestamptz not null,
  channel public.reminder_channel not null default 'app',
  status public.reminder_status not null default 'pending',
  approved_to_send boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_followups (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  doctor_id uuid not null references public.doctors (id) on delete restrict,
  follow_up_date timestamptz not null,
  status public.followup_status not null default 'scheduled',
  summary_json jsonb not null default '{}'::jsonb,
  transcript_text text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_activity (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients (id) on delete set null,
  activity_type public.ai_activity_type not null,
  outcome public.ai_activity_outcome not null default 'completed',
  summary text,
  related_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  name text not null,
  role_title text not null,
  department text not null,
  shift_schedule text,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  amount numeric(12, 2) not null default 0,
  status public.billing_status not null default 'pending',
  payer text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'General',
  quantity_on_hand integer not null default 0,
  reorder_threshold integer not null default 0,
  unit_cost numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  detail text,
  timestamp timestamptz not null default now()
);

create index if not exists idx_patients_doctor on public.patients (assigned_doctor_id);
create index if not exists idx_appointments_doctor_dt on public.appointments (doctor_id, datetime);
create index if not exists idx_appointments_status on public.appointments (status);
create index if not exists idx_ai_followups_status on public.ai_followups (status);
create index if not exists idx_ai_activity_created on public.ai_activity (created_at desc);
create index if not exists idx_billing_status on public.billing_records (status);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'patient')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers
create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin_or_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin', 'staff'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

create or replace function public.current_doctor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.doctors where profile_id = auth.uid() limit 1;
$$;

create or replace function public.doctor_owns_patient(p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.patients
    where id = p_patient_id
      and assigned_doctor_id = public.current_doctor_id()
  ) or exists (
    select 1 from public.appointments
    where patient_id = p_patient_id
      and doctor_id = public.current_doctor_id()
  );
$$;

create or replace function public.write_audit(
  p_action text,
  p_target_table text default null,
  p_target_id uuid default null,
  p_detail text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, target_table, target_id, detail)
  values (auth.uid(), p_action, p_target_table, p_target_id, p_detail);
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.patient_reports enable row level security;
alter table public.medication_plans enable row level security;
alter table public.ai_reminders enable row level security;
alter table public.ai_followups enable row level security;
alter table public.ai_activity enable row level security;
alter table public.staff enable row level security;
alter table public.billing_records enable row level security;
alter table public.inventory_items enable row level security;
alter table public.audit_log enable row level security;

-- Profiles
create policy "profiles_select_own_or_staff"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin_or_staff());

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- Doctors
create policy "doctors_select_authenticated"
  on public.doctors for select to authenticated
  using (true);

create policy "doctors_write_admin"
  on public.doctors for all
  using (public.is_admin())
  with check (public.is_admin());

-- Patients
create policy "patients_select_staff_or_assigned_doctor"
  on public.patients for select
  using (
    public.is_admin_or_staff()
    or assigned_doctor_id = public.current_doctor_id()
    or public.doctor_owns_patient(id)
  );

create policy "patients_write_admin_staff"
  on public.patients for insert
  with check (public.is_admin_or_staff());

create policy "patients_update_admin_staff_doctor"
  on public.patients for update
  using (
    public.is_admin_or_staff()
    or assigned_doctor_id = public.current_doctor_id()
  );

-- Appointments
create policy "appointments_select"
  on public.appointments for select
  using (
    public.is_admin_or_staff()
    or doctor_id = public.current_doctor_id()
  );

create policy "appointments_write_staff_admin"
  on public.appointments for insert
  with check (public.is_admin_or_staff() or doctor_id = public.current_doctor_id());

create policy "appointments_update"
  on public.appointments for update
  using (public.is_admin_or_staff() or doctor_id = public.current_doctor_id());

-- Reports
create policy "reports_select"
  on public.patient_reports for select
  using (public.is_admin_or_staff() or doctor_id = public.current_doctor_id());

create policy "reports_insert_doctor"
  on public.patient_reports for insert
  with check (doctor_id = public.current_doctor_id() or public.is_admin());

create policy "reports_update_doctor"
  on public.patient_reports for update
  using (doctor_id = public.current_doctor_id() or public.is_admin());

-- Medication plans
create policy "meds_select"
  on public.medication_plans for select
  using (public.is_admin_or_staff() or doctor_id = public.current_doctor_id());

create policy "meds_insert_doctor"
  on public.medication_plans for insert
  with check (doctor_id = public.current_doctor_id() or public.is_admin());

create policy "meds_update_doctor"
  on public.medication_plans for update
  using (doctor_id = public.current_doctor_id() or public.is_admin());

-- Reminders (never auto-sent without approval flag; send worker checks approved_to_send)
create policy "reminders_select"
  on public.ai_reminders for select
  using (
    public.is_admin_or_staff()
    or exists (
      select 1 from public.medication_plans mp
      where mp.id = medication_plan_id and mp.doctor_id = public.current_doctor_id()
    )
    or public.doctor_owns_patient(patient_id)
  );

create policy "reminders_insert_doctor"
  on public.ai_reminders for insert
  with check (public.doctor_owns_patient(patient_id) or public.is_admin_or_staff());

create policy "reminders_update"
  on public.ai_reminders for update
  using (public.doctor_owns_patient(patient_id) or public.is_admin_or_staff());

-- Follow-ups
create policy "followups_select"
  on public.ai_followups for select
  using (public.is_admin_or_staff() or doctor_id = public.current_doctor_id());

create policy "followups_insert_doctor"
  on public.ai_followups for insert
  with check (doctor_id = public.current_doctor_id() or public.is_admin_or_staff());

create policy "followups_update"
  on public.ai_followups for update
  using (doctor_id = public.current_doctor_id() or public.is_admin_or_staff());

-- AI activity
create policy "ai_activity_select"
  on public.ai_activity for select
  using (
    public.is_admin_or_staff()
    or public.doctor_owns_patient(patient_id)
  );

create policy "ai_activity_insert_staff"
  on public.ai_activity for insert
  with check (public.is_admin_or_staff() or public.current_role() = 'doctor');

-- Staff directory (staff can read; only admin edits HR fields)
create policy "staff_select"
  on public.staff for select
  using (public.is_admin_or_staff() or public.current_role() = 'doctor');

create policy "staff_insert_admin"
  on public.staff for insert
  with check (public.is_admin());

create policy "staff_update_admin"
  on public.staff for update
  using (public.is_admin());

create policy "staff_delete_admin"
  on public.staff for delete
  using (public.is_admin());

-- Billing: staff may read but not edit; only admin writes
create policy "billing_select"
  on public.billing_records for select
  using (public.is_admin_or_staff());

create policy "billing_write_admin"
  on public.billing_records for all
  using (public.is_admin())
  with check (public.is_admin());

-- Inventory
create policy "inventory_select"
  on public.inventory_items for select
  using (public.is_admin_or_staff());

create policy "inventory_write_admin_staff"
  on public.inventory_items for all
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

-- Audit log read-only for admin/staff
create policy "audit_select"
  on public.audit_log for select
  using (public.is_admin_or_staff());

create policy "audit_insert_authenticated"
  on public.audit_log for insert
  with check (auth.uid() is not null);

-- Realtime for escalations
alter publication supabase_realtime add table public.ai_followups;
alter publication supabase_realtime add table public.ai_activity;
