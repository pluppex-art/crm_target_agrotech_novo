-- Table: lead_stage_reasons
-- Stores the reason whenever a lead is moved to "Aquecimento" or "Perdido"

create table if not exists public.lead_stage_reasons (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references public.leads(id) on delete cascade,
  lead_name     text not null default '',
  stage_name    text not null,
  reason        text not null,
  notes         text,
  recorded_by   uuid references public.perfis(id) on delete set null,
  recorded_at   timestamptz not null default now()
);

-- Indexes for fast dashboard aggregation queries
create index if not exists idx_stage_reasons_stage_name  on public.lead_stage_reasons(stage_name);
create index if not exists idx_stage_reasons_reason       on public.lead_stage_reasons(reason);
create index if not exists idx_stage_reasons_recorded_at  on public.lead_stage_reasons(recorded_at);
create index if not exists idx_stage_reasons_lead_id      on public.lead_stage_reasons(lead_id);

-- RLS
alter table public.lead_stage_reasons enable row level security;

create policy "Authenticated users can insert stage reasons"
  on public.lead_stage_reasons for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can read stage reasons"
  on public.lead_stage_reasons for select
  using (auth.uid() is not null);
