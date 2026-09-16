-- Voice navigator emergency flags (client-tool writes from the browser during local/dev).
-- Does not alter RLS on existing tables. Staff notification goes through a new
-- security-definer RPC that also inserts an escalated ai_activity row.

create table if not exists public.emergency_flags (
  id uuid primary key default gen_random_uuid(),
  conversation_id text,
  reason text not null,
  created_at timestamptz not null default now(),
  resolved boolean not null default false
);

create index if not exists emergency_flags_created_at_idx
  on public.emergency_flags (created_at desc);

alter table public.emergency_flags enable row level security;

drop policy if exists "emergency_flags_insert_anon" on public.emergency_flags;
create policy "emergency_flags_insert_anon"
  on public.emergency_flags for insert
  to anon, authenticated
  with check (true);

drop policy if exists "emergency_flags_select_staff" on public.emergency_flags;
create policy "emergency_flags_select_staff"
  on public.emergency_flags for select
  using (public.is_admin_or_staff());

drop policy if exists "emergency_flags_update_staff" on public.emergency_flags;
create policy "emergency_flags_update_staff"
  on public.emergency_flags for update
  using (public.is_admin_or_staff());

create or replace function public.flag_voice_emergency(
  p_reason text,
  p_conversation_id text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Emergency reason is required';
  end if;

  insert into public.emergency_flags (conversation_id, reason)
  values (nullif(trim(coalesce(p_conversation_id, '')), ''), trim(p_reason))
  returning id into v_id;

  insert into public.ai_activity (activity_type, outcome, summary, related_id)
  values (
    'voice_navigator',
    'escalated',
    format('Emergency flag: caller instructed to call 911. Reason: %s', trim(p_reason)),
    v_id
  );

  insert into public.audit_log (actor_id, action, target_table, target_id, detail)
  values (
    null,
    'voice.emergency_flag',
    'emergency_flags',
    v_id,
    left(trim(p_reason), 500)
  );

  return v_id;
end;
$$;

grant execute on function public.flag_voice_emergency(text, text) to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.emergency_flags;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
