-- Doctor availability windows, leave blocks, and one active appointment per start time.
-- Wall-clock times are hospital local (America/New_York). Instants are timestamptz UTC.

create table if not exists public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  availability_date date,
  weekday smallint,
  start_time time not null,
  end_time time not null,
  visit_type public.visit_type not null,
  location text,
  recurring boolean not null default false,
  recurrence_end_date date,
  created_at timestamptz not null default now(),
  constraint doctor_availability_time_order check (end_time > start_time),
  constraint doctor_availability_shape check (
    (recurring = true and weekday between 1 and 7)
    or (recurring = false and availability_date is not null)
  )
);

create index if not exists doctor_availability_doctor_idx
  on public.doctor_availability (doctor_id);

create table if not exists public.doctor_blocks (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint doctor_blocks_time_order check (ends_at > starts_at)
);

create index if not exists doctor_blocks_doctor_idx
  on public.doctor_blocks (doctor_id, starts_at);

create unique index if not exists appointments_doctor_active_start_uidx
  on public.appointments (doctor_id, datetime)
  where status in ('pending', 'confirmed')
    and doctor_id is not null;

alter table public.doctor_availability enable row level security;
alter table public.doctor_blocks enable row level security;

create policy "doctor_availability_select_own"
  on public.doctor_availability for select
  using (doctor_id = public.current_doctor_id() or public.is_admin());

create policy "doctor_availability_insert_own"
  on public.doctor_availability for insert
  with check (doctor_id = public.current_doctor_id());

create policy "doctor_availability_update_own"
  on public.doctor_availability for update
  using (doctor_id = public.current_doctor_id())
  with check (doctor_id = public.current_doctor_id());

create policy "doctor_availability_delete_own"
  on public.doctor_availability for delete
  using (doctor_id = public.current_doctor_id());

create policy "doctor_blocks_select_own"
  on public.doctor_blocks for select
  using (doctor_id = public.current_doctor_id() or public.is_admin());

create policy "doctor_blocks_insert_own"
  on public.doctor_blocks for insert
  with check (doctor_id = public.current_doctor_id());

create policy "doctor_blocks_delete_own"
  on public.doctor_blocks for delete
  using (doctor_id = public.current_doctor_id());

-- Seed Dr. Amara Velloso when that physician row exists and has no windows yet.
insert into public.doctor_availability (
  doctor_id, weekday, start_time, end_time, visit_type, location, recurring
)
select d.id, seed.weekday, seed.start_time::time, seed.end_time::time, seed.visit_type::public.visit_type, seed.location, true
from public.doctors d
cross join (
  values
    (1, '09:00', '13:00', 'in_person', 'Fairmont Ridge'::text),
    (3, '09:00', '13:00', 'in_person', 'Fairmont Ridge'::text),
    (5, '09:00', '13:00', 'in_person', 'Fairmont Ridge'::text),
    (2, '14:00', '17:00', 'telehealth', null::text),
    (4, '14:00', '17:00', 'telehealth', null::text)
) as seed(weekday, start_time, end_time, visit_type, location)
where d.slug = 'amara-velloso'
  and not exists (
    select 1 from public.doctor_availability existing where existing.doctor_id = d.id
  );
