create table if not exists copilot_sessions (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  transcript  jsonb not null default '[]',
  bant        jsonb not null default '{}',
  commercial  jsonb not null default '{}',
  suggestions jsonb not null default '[]',
  objections  jsonb not null default '[]',
  summary     text,
  urgent_alert text,
  created_at  timestamptz not null default now()
);

alter table copilot_sessions enable row level security;

drop policy if exists "copilot_sessions_select" on copilot_sessions;
drop policy if exists "copilot_sessions_insert" on copilot_sessions;

create policy "copilot_sessions_select" on copilot_sessions
  for select using (auth.role() = 'authenticated');

create policy "copilot_sessions_insert" on copilot_sessions
  for insert with check (auth.role() = 'authenticated');

create index if not exists copilot_sessions_lead_id_idx on copilot_sessions(lead_id);
create index if not exists copilot_sessions_created_at_idx on copilot_sessions(created_at desc);
