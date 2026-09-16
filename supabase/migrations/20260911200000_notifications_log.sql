-- Email notification attempt log (Gmail SMTP via app mail service).
create table if not exists public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.appointments (id) on delete set null,
  type text not null check (type in ('request_submitted', 'appointment_confirmed')),
  status text not null check (status in ('sent', 'mocked', 'failed')),
  error_message text,
  sent_at timestamptz not null default now()
);

create index if not exists notifications_log_booking_id_idx
  on public.notifications_log (booking_id);

create index if not exists notifications_log_sent_at_idx
  on public.notifications_log (sent_at desc);

alter table public.notifications_log enable row level security;

-- Server / service role inserts; staff can read for follow-up.
create policy "notifications_log_insert"
  on public.notifications_log
  for insert
  with check (true);

create policy "notifications_log_select_staff"
  on public.notifications_log
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'staff', 'doctor')
    )
  );

comment on table public.notifications_log is
  'Outbound email notification attempts for visit intake and appointment confirmation.';
