-- Table: report_settings
-- Stores key-value configuration for the daily report system

create table if not exists public.report_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       text,
  updated_at  timestamptz not null default now()
);

-- Seed default values
insert into public.report_settings (key, value) values
  ('company_name',          'TARGET AGROTECH'),
  ('commission_rate',       '18'),
  ('report_enabled',        'true'),
  ('leader_contacts',       '[]'),
  -- WhatsApp Business Cloud API (Meta)
  -- Obter em: https://developers.facebook.com/apps
  ('waba_access_token',     ''),
  ('waba_phone_number_id',  '')
on conflict (key) do nothing;

-- RLS
alter table public.report_settings enable row level security;

create policy "Authenticated users can read report settings"
  on public.report_settings for select
  using (auth.uid() is not null);

create policy "Authenticated users can update report settings"
  on public.report_settings for update
  using (auth.uid() is not null);

create policy "Authenticated users can insert report settings"
  on public.report_settings for insert
  with check (auth.uid() is not null);

-- Trigger to keep updated_at current
create or replace function public.set_report_settings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_report_settings_updated_at
  before update on public.report_settings
  for each row execute function public.set_report_settings_updated_at();
