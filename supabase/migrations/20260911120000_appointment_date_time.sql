-- Confirmed slot fields set when admin assigns a doctor with date/time.
alter table public.appointments
  add column if not exists appointment_date date,
  add column if not exists appointment_time time;

comment on column public.appointments.appointment_date is
  'Admin-confirmed visit date (YYYY-MM-DD). Null until assignment is confirmed with a slot.';
comment on column public.appointments.appointment_time is
  'Admin-confirmed visit time (HH:MM:SS). Null until assignment is confirmed with a slot.';
