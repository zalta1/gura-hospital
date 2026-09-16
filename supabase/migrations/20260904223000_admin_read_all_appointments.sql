-- Admin appointment visibility: staff/admin must SELECT every booking, not only
-- rows matching current_doctor_id(). Public submit_booking writes status pending
-- (and pipeline_stage pending_intake when that column exists).
-- After this migration: NOTIFY pgrst, 'reload schema';

create or replace function public.is_admin_or_staff()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role::text into v_role from public.profiles where id = auth.uid();
  if v_role in ('admin', 'staff', 'administrator', 'receptionist', 'nurse') then
    return true;
  end if;
  if to_regclass('public.user_roles') is not null then
    return exists (
      select 1
      from public.user_roles
      where user_id = auth.uid()
        and role::text in (
          'admin', 'staff', 'administrator', 'receptionist', 'nurse', 'provider'
        )
    );
  end if;
  return false;
end;
$$;

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role::text into v_role from public.profiles where id = auth.uid();
  if v_role in ('admin', 'administrator') then
    return true;
  end if;
  if to_regclass('public.user_roles') is not null then
    return exists (
      select 1
      from public.user_roles
      where user_id = auth.uid()
        and role::text in ('admin', 'administrator')
    );
  end if;
  return false;
end;
$$;

grant execute on function public.is_admin_or_staff() to authenticated, anon;
grant execute on function public.is_admin() to authenticated, anon;

grant select on table public.appointments to authenticated;
grant select on table public.patients to authenticated;
grant select on table public.doctors to authenticated;

drop policy if exists "appointments_select_admin_all" on public.appointments;
create policy "appointments_select_admin_all"
  on public.appointments for select
  to authenticated
  using (public.is_admin_or_staff());

notify pgrst, 'reload schema';
