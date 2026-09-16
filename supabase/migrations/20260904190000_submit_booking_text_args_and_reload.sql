-- LOCAL PORTAL SCHEMA ONLY (doctors / doctor_id / datetime / pipeline_stage).
-- Do NOT run this against Lovable cloud project amesefimsbkcjmuirzmp.
-- Cloud SQL lives in superbase/migrations/20260904190000_submit_booking.sql
--
-- Recreate public.submit_booking with JSON-compatible text args and reload PostgREST.
-- PostgREST matches RPCs by parameter NAME + JSON type. A `date` argument will not
-- match a JSON string and yields PGRST202 ("not found in the schema cache").
-- After any CREATE/ALTER of RPCs, always:
--   NOTIFY pgrst, 'reload schema';

drop function if exists public.submit_booking(text, text, text, text, date, text, text, text, text);
drop function if exists public.submit_booking(text, text, text, text, text, text, text, text, text);

create or replace function public.submit_booking(
  p_full_name text,
  p_email text,
  p_phone text,
  p_reason text,
  p_dob text default null,
  p_insurance text default null,
  p_preferred_specialty text default null,
  p_visit_preference text default 'in-person',
  p_doctor_slug text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_id uuid;
  v_patient_id uuid;
  v_appointment_id uuid;
  v_campus text;
  v_visit_type public.visit_type;
  v_status public.appointment_status;
  v_pipeline public.pipeline_stage;
  v_email text := lower(trim(p_email));
  v_dob date;
begin
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Full name is required';
  end if;
  if v_email is null or v_email = '' then
    raise exception 'Email is required';
  end if;

  begin
    if p_dob is not null and length(trim(p_dob)) > 0 then
      v_dob := trim(p_dob)::date;
    end if;
  exception when others then
    v_dob := null;
  end;

  if p_doctor_slug is not null and length(trim(p_doctor_slug)) > 0 then
    select id into v_doctor_id
    from public.doctors
    where slug = trim(p_doctor_slug)
    limit 1;
  end if;

  if p_visit_preference = 'telehealth' then
    v_visit_type := 'telehealth';
    v_campus := 'Telehealth';
  elsif p_visit_preference = 'alder-bay' then
    v_visit_type := 'in_person';
    v_campus := 'Alder Bay';
  else
    v_visit_type := 'in_person';
    v_campus := 'Fairmont Ridge';
  end if;

  if v_doctor_id is null then
    v_status := 'unassigned';
    v_pipeline := 'pending_intake';
  else
    v_status := 'pending';
    v_pipeline := 'pending_intake';
  end if;

  select id into v_patient_id
  from public.patients
  where lower(email) = v_email
  limit 1;

  if v_patient_id is null then
    insert into public.patients (
      full_name, dob, email, phone, insurance, assigned_doctor_id
    ) values (
      trim(p_full_name),
      v_dob,
      v_email,
      nullif(trim(coalesce(p_phone, '')), ''),
      nullif(trim(coalesce(p_insurance, '')), ''),
      v_doctor_id
    )
    returning id into v_patient_id;
  else
    update public.patients set
      full_name = trim(p_full_name),
      dob = coalesce(v_dob, dob),
      phone = coalesce(nullif(trim(coalesce(p_phone, '')), ''), phone),
      insurance = coalesce(nullif(trim(coalesce(p_insurance, '')), ''), insurance),
      assigned_doctor_id = coalesce(v_doctor_id, assigned_doctor_id)
    where id = v_patient_id;
  end if;

  insert into public.appointments (
    patient_id,
    doctor_id,
    datetime,
    status,
    pipeline_stage,
    reason_for_visit,
    visit_type,
    campus,
    preferred_specialty,
    visit_preference
  ) values (
    v_patient_id,
    v_doctor_id,
    now(),
    v_status,
    v_pipeline,
    nullif(trim(coalesce(p_reason, '')), ''),
    v_visit_type,
    v_campus,
    nullif(trim(coalesce(p_preferred_specialty, '')), ''),
    nullif(trim(coalesce(p_visit_preference, '')), '')
  )
  returning id into v_appointment_id;

  insert into public.audit_log (actor_id, action, target_table, target_id, detail)
  values (
    null,
    'booking.submit',
    'appointments',
    v_appointment_id,
    format('Public booking for %s (doctor_slug=%s)', v_email, coalesce(p_doctor_slug, 'none'))
  );

  return v_appointment_id;
end;
$$;

grant execute on function public.submit_booking(
  text, text, text, text, text, text, text, text, text
) to anon, authenticated;

notify pgrst, 'reload schema';
