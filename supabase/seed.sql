-- Demo users + clinical seed for local Supabase
-- Admin presentation account: admin@gurahospital.demo / DemoGura2026!
-- Legacy demo passwords (staff / leftover accounts): gura-demo-2026
-- After reset, run: npx tsx scripts/seed-portal-doctors.ts
--   (creates every Find a Doctor physician as a real auth user — do not duplicate that list here)
-- All UUIDs must be hex-only (0-9a-f).

create extension if not exists pgcrypto with schema extensions;

create or replace function public._seed_user(
  p_id uuid,
  p_email text,
  p_password text,
  p_full_name text,
  p_role public.app_role
) returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if exists (select 1 from auth.users where id = p_id or email = p_email) then
    update public.profiles
      set full_name = p_full_name, role = p_role, email = p_email
      where id = p_id or email = p_email;
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name, 'role', p_role::text),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    p_id, p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email', p_id::text, now(), now(), now()
  );
end;
$$;

select public._seed_user('11111111-1111-1111-1111-111111111111', 'admin@gurahospital.demo', 'DemoGura2026!', 'Gura Admin', 'admin');
select public._seed_user('22222222-2222-2222-2222-222222222222', 'staff@gura.example', 'gura-demo-2026', 'Priya Nair', 'staff');
select public._seed_user('33333333-3333-3333-3333-333333333333', 'doctor@gura.example', 'gura-demo-2026', 'Amara Velloso, MD', 'doctor');
select public._seed_user('44444444-4444-4444-4444-444444444444', 'doctor2@gura.example', 'gura-demo-2026', 'Callum Whitfield, MD', 'doctor');
select public._seed_user('55555555-5555-5555-5555-555555555555', 'patient@gura.example', 'gura-demo-2026', 'Jordan Avery', 'patient');

update public.profiles set role = 'admin', full_name = 'Gura Admin' where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set role = 'staff', full_name = 'Priya Nair' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set role = 'doctor', full_name = 'Amara Velloso, MD' where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set role = 'doctor', full_name = 'Callum Whitfield, MD' where id = '44444444-4444-4444-4444-444444444444';
update public.profiles set role = 'patient', full_name = 'Jordan Avery' where id = '55555555-5555-5555-5555-555555555555';

insert into public.doctors (id, profile_id, name, specialty, office, phone, on_shift, slug, specialty_slug)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Dr. Amara Velloso, MD, FACC', 'Cardiology', 'Heart Center 3F', '(555) 210-4471', true, 'amara-velloso', 'cardiology-electrophysiology'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'Dr. Callum Whitfield, MD, FACP', 'Internal Medicine', 'Pavilion A 1F', '(555) 210-3301', true, 'callum-whitfield', 'primary-care')
on conflict (id) do nothing;

insert into public.patients (id, full_name, dob, email, phone, address, insurance, assigned_doctor_id)
values
  ('c1111111-1111-1111-1111-111111111111', 'Jordan Avery', '1988-04-12', 'jordan.avery@patient.example', '(555) 401-2201', '88 Harbor Walk, Fairmont Ridge', 'Aetna PPO', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('c2222222-2222-2222-2222-222222222222', 'Morgan Ellis', '1975-09-03', 'morgan.ellis@patient.example', '(555) 401-2202', '14 Cedar Lane, Alder Bay', 'UnitedHealthcare', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('c3333333-3333-3333-3333-333333333333', 'Riley Chen', '1992-01-28', 'riley.chen@patient.example', '(555) 401-2203', '9 Oak Street, Fairmont Ridge', 'Blue Cross', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('c4444444-4444-4444-4444-444444444444', 'Sam Okonkwo', '1968-11-15', 'sam.okonkwo@patient.example', '(555) 401-2204', '220 Ridge Ave, Fairmont Ridge', 'Medicare', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
on conflict (id) do nothing;

insert into public.appointments (id, patient_id, doctor_id, datetime, status, pipeline_stage, reason_for_visit, visit_type, campus)
values
  ('a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', date_trunc('day', now()) + interval '9 hours', 'confirmed', 'confirmed', 'Palpitations and fatigue', 'in_person', 'Fairmont Ridge'),
  ('a2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', date_trunc('day', now()) + interval '11 hours', 'pending', 'navigator_matched', 'Follow-up after Holter monitor', 'telehealth', 'Fairmont Ridge'),
  ('a3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', date_trunc('day', now()) + interval '14 hours', 'pending', 'pending_intake', 'Annual physical', 'in_person', 'Alder Bay'),
  ('a4444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', date_trunc('day', now()) + interval '1 day' + interval '10 hours', 'confirmed', 'confirmed', 'Chest discomfort on exertion', 'in_person', 'Fairmont Ridge'),
  ('a5555555-5555-5555-5555-555555555555', 'c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', date_trunc('day', now()) - interval '7 days' + interval '10 hours', 'completed', 'completed', 'New patient cardiology consult', 'in_person', 'Fairmont Ridge')
on conflict (id) do nothing;

insert into public.patient_reports (id, patient_id, doctor_id, appointment_id, diagnosis, notes, vitals, ai_drafted, approved_by_doctor)
values (
  'd1111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'a5555555-5555-5555-5555-555555555555',
  'Paroxysmal atrial fibrillation (provisional)',
  'Discussed symptom diary, ECG reviewed. Plan for ambulatory monitoring. Patient counseled on when to seek emergency care.',
  '{"bp":"128/78","hr":92,"temp":98.4,"spo2":98}'::jsonb,
  false,
  true
) on conflict (id) do nothing;

insert into public.medication_plans (id, patient_id, doctor_id, drug_name, dose, schedule, duration)
values (
  'e1111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Metoprolol tartrate',
  '25 mg',
  'Twice daily with meals',
  '30 days'
) on conflict (id) do nothing;

insert into public.ai_reminders (id, patient_id, medication_plan_id, scheduled_time, channel, status, approved_to_send)
values (
  'aa111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  'e1111111-1111-1111-1111-111111111111',
  now() + interval '2 hours',
  'sms',
  'pending',
  false
) on conflict (id) do nothing;

insert into public.ai_followups (id, patient_id, doctor_id, follow_up_date, status, summary_json, transcript_text)
values
(
  'f1111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  now() - interval '1 day',
  'completed',
  '{"adherence":"mostly_adherent","sentiment":"cautiously_positive","symptoms_reported":["mild fatigue"],"escalation_flag":false}'::jsonb,
  'Navigator: How have you been feeling since your visit?\nPatient: A bit tired but the palpitations are less frequent.\nNavigator: Are you taking metoprolol as prescribed?\nPatient: Yes, morning and evening.'
),
(
  'f2222222-2222-2222-2222-222222222222',
  'c2222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  now() - interval '3 hours',
  'escalated',
  '{"adherence":"uncertain","sentiment":"distressed","symptoms_reported":["chest pressure","shortness of breath"],"escalation_flag":true}'::jsonb,
  'Navigator: Any new symptoms today?\nPatient: I have pressure in my chest and feel short of breath when walking.\nNavigator: That needs clinician review right away. I am escalating to your care team.'
) on conflict (id) do nothing;

insert into public.ai_activity (id, patient_id, activity_type, outcome, summary, related_id, created_at)
values
  ('ca111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'wellness_check', 'escalated', 'Chest pressure reported — escalated to care team', 'f2222222-2222-2222-2222-222222222222', now() - interval '3 hours'),
  ('ca222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'wellness_check', 'completed', 'Post-visit check completed; adherence mostly good', 'f1111111-1111-1111-1111-111111111111', now() - interval '1 day'),
  ('ca333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'voice_navigator', 'completed', 'Intake navigator matched to Cardiology', 'a1111111-1111-1111-1111-111111111111', now() - interval '2 days'),
  ('ca444444-4444-4444-4444-444444444444', 'c3333333-3333-3333-3333-333333333333', 'medication_reminder', 'no_answer', 'Reminder call — no answer', null, now() - interval '5 hours')
on conflict (id) do nothing;

insert into public.staff (id, profile_id, name, role_title, department, shift_schedule)
values
  ('cd111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Priya Nair', 'Care Navigator', 'Patient Access', 'Mon–Fri 07:00–15:00'),
  ('cd222222-2222-2222-2222-222222222222', null, 'Diego Alvarez', 'Unit Coordinator', 'Heart Center', 'Sun–Wed 15:00–23:00'),
  ('cd333333-3333-3333-3333-333333333333', null, 'Hannah Brooks', 'Billing Specialist', 'Revenue Cycle', 'Mon–Fri 09:00–17:00')
on conflict (id) do nothing;

insert into public.billing_records (id, patient_id, appointment_id, amount, status, payer, created_at)
values
  ('b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', 425.00, 'paid', 'Aetna PPO', date_trunc('month', now()) + interval '2 days'),
  ('b2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 180.00, 'pending', 'UnitedHealthcare', now() - interval '1 day'),
  ('b3333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-444444444444', null, 960.00, 'insurance_review', 'Medicare', now() - interval '3 days'),
  ('b4444444-4444-4444-4444-444444444444', 'c3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 210.00, 'denied', 'Blue Cross', now() - interval '10 days')
on conflict (id) do nothing;

insert into public.inventory_items (id, name, category, quantity_on_hand, reorder_threshold, unit_cost)
values
  ('ce111111-1111-1111-1111-111111111111', 'ECG electrode packs', 'Cardiology', 12, 20, 18.50),
  ('ce222222-2222-2222-2222-222222222222', 'Nitrile gloves (box)', 'PPE', 140, 40, 9.25),
  ('ce333333-3333-3333-3333-333333333333', 'Holter monitor kits', 'Diagnostics', 3, 5, 220.00),
  ('ce444444-4444-4444-4444-444444444444', 'Telehealth headset kits', 'IT', 18, 8, 65.00)
on conflict (id) do nothing;

insert into public.audit_log (actor_id, action, target_table, target_id, detail)
values
  ('11111111-1111-1111-1111-111111111111', 'seed.bootstrap', 'profiles', '11111111-1111-1111-1111-111111111111', 'Local demo seed applied'),
  ('33333333-3333-3333-3333-333333333333', 'report.approve', 'patient_reports', 'd1111111-1111-1111-1111-111111111111', 'Approved consult report for Jordan Avery'),
  ('22222222-2222-2222-2222-222222222222', 'escalation.view', 'ai_followups', 'f2222222-2222-2222-2222-222222222222', 'Opened escalation queue item');

drop function if exists public._seed_user(uuid, text, text, text, public.app_role);
