create table if not exists form_configs (
  form_key   text primary key,
  title      text not null,
  product    text not null,
  price      numeric not null default 197,
  whatsapp_number text not null default '5566999763455',
  badge_label text not null default '',
  active     boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into form_configs (form_key, title, product, price, whatsapp_number, badge_label)
values
  ('drone', 'Formulário Drone Agrícola', 'Curso de Piloto de Drone Agrícola', 197, '5566999763455', 'Drone'),
  ('ia',    'Formulário Inseminação Artificial', 'Curso de Inseminação Artificial em Bovinos', 197, '5566999763455', 'IA')
on conflict (form_key) do nothing;

alter table form_configs enable row level security;

drop policy if exists "form_configs_select" on form_configs;
drop policy if exists "form_configs_update" on form_configs;

create policy "form_configs_select" on form_configs
  for select using (auth.role() = 'authenticated');

create policy "form_configs_update" on form_configs
  for update using (auth.role() = 'authenticated');
