-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.anexos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo_referencia text NOT NULL,
  referencia_id uuid NOT NULL,
  url_arquivo text NOT NULL,
  nome_arquivo text,
  tipo_arquivo text,
  enviado_por uuid,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT anexos_pkey PRIMARY KEY (id),
  CONSTRAINT anexos_enviado_por_fkey FOREIGN KEY (enviado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.call_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lead_id uuid,
  called_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT call_logs_pkey PRIMARY KEY (id),
  CONSTRAINT call_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.perfis(id),
  CONSTRAINT call_logs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id)
);
CREATE TABLE public.cargos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  permissions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT cargos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['turma'::text, 'activity'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.centro_custos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  ativo boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT centro_custos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.commission_results (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  squad_id uuid,
  role_type text NOT NULL,
  period_month date NOT NULL,
  target_revenue numeric DEFAULT 0,
  realized_revenue numeric DEFAULT 0,
  achievement_percent numeric DEFAULT 0,
  fixed_amount numeric DEFAULT 0,
  variable_amount numeric DEFAULT 0,
  accelerator_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  semaphore_status text CHECK (semaphore_status = ANY (ARRAY['RED'::text, 'YELLOW'::text, 'GREEN'::text])),
  status text DEFAULT 'TO_PAY'::text CHECK (status = ANY (ARRAY['TO_PAY'::text, 'PAID'::text, 'CANCELLED'::text])),
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  level text,
  realized_sql integer DEFAULT 0,
  realized_enrollments integer DEFAULT 0,
  bonus_amount numeric DEFAULT 0,
  special_bonus_amount numeric DEFAULT 0,
  CONSTRAINT commission_results_pkey PRIMARY KEY (id),
  CONSTRAINT commission_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.perfis(id),
  CONSTRAINT commission_results_squad_id_fkey FOREIGN KEY (squad_id) REFERENCES public.squads(id),
  CONSTRAINT commission_results_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT commission_results_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.commission_rules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  role_type text CHECK (role_type = ANY (ARRAY['CLOSER'::text, 'SDR'::text, 'MANAGER'::text])),
  level text NOT NULL,
  fixed_amount numeric NOT NULL DEFAULT 0,
  variable_amount numeric NOT NULL DEFAULT 0,
  target_quantity integer DEFAULT 0,
  target_revenue numeric NOT NULL DEFAULT 0,
  accelerator_amount numeric NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  bonus_per_enrollment numeric DEFAULT 0,
  target_sql integer DEFAULT 0,
  CONSTRAINT commission_rules_pkey PRIMARY KEY (id),
  CONSTRAINT commission_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT commission_rules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.crm_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  CONSTRAINT crm_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.financial_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type = ANY (ARRAY['INCOME'::text, 'EXPENSE'::text])),
  dre_group text NOT NULL,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT financial_categories_pkey PRIMARY KEY (id),
  CONSTRAINT financial_categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT financial_categories_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.financial_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type = ANY (ARRAY['INCOME'::text, 'EXPENSE'::text])),
  status text NOT NULL CHECK (status = ANY (ARRAY['PENDING'::text, 'PAID'::text, 'CANCELLED'::text, 'OVERDUE'::text])),
  category_id uuid,
  lead_id uuid,
  class_id uuid,
  user_id uuid,
  source_transaction_id uuid,
  due_date date,
  payment_date date,
  origin_type text CHECK (origin_type = ANY (ARRAY['MANUAL'::text, 'PIPELINE'::text, 'CLASS'::text, 'COMMISSION'::text, 'PARTNER'::text, 'REFUND'::text])),
  partner_origin text CHECK (partner_origin = ANY (ARRAY['TARGET'::text, 'PLUPPEX'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  cancellation_reason text,
  cancelled_at timestamp with time zone,
  tipo_referencia text,
  referencia_id uuid,
  centro_custo_id uuid,
  deletado_em timestamp with time zone,
  deletado_por uuid,
  cost_center text CHECK (cost_center = ANY (ARRAY['cursos'::text, 'servico_drone'::text, 'administrativo'::text])),
  CONSTRAINT financial_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT financial_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.perfis(id),
  CONSTRAINT financial_transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.financial_categories(id),
  CONSTRAINT financial_transactions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT financial_transactions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.turmas(id),
  CONSTRAINT financial_transactions_source_transaction_id_fkey FOREIGN KEY (source_transaction_id) REFERENCES public.financial_transactions(id),
  CONSTRAINT financial_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT financial_transactions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id),
  CONSTRAINT financial_transactions_centro_custo_id_fkey FOREIGN KEY (centro_custo_id) REFERENCES public.centro_custos(id),
  CONSTRAINT financial_transactions_deletado_por_fkey FOREIGN KEY (deletado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'company'::text,
  seller_name text,
  revenue_goal numeric NOT NULL DEFAULT 0,
  leads_goal integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  seller_id uuid,
  calls_goal integer DEFAULT 0,
  CONSTRAINT goals_pkey PRIMARY KEY (id),
  CONSTRAINT goals_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.perfis(id)
);
CREATE TABLE public.historico_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo_referencia text NOT NULL,
  referencia_id uuid NOT NULL,
  status_antigo text,
  status_novo text,
  observacao text,
  alterado_por uuid,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT historico_status_pkey PRIMARY KEY (id),
  CONSTRAINT historico_status_alterado_por_fkey FOREIGN KEY (alterado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.lead_class_enrollments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL,
  class_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ENROLLED'::text CHECK (status = ANY (ARRAY['ENROLLED'::text, 'CONFIRMED'::text, 'TRANSFERRED'::text, 'CANCELLED'::text, 'COMPLETED'::text, 'NO_SHOW'::text])),
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  confirmed_at timestamp with time zone,
  removed_at timestamp with time zone,
  completed_at timestamp with time zone,
  transfer_to_class_id uuid,
  transferred_at timestamp with time zone,
  cancellation_reason text,
  refund_status text NOT NULL DEFAULT 'NONE'::text CHECK (refund_status = ANY (ARRAY['NONE'::text, 'PARTIAL'::text, 'FULL'::text])),
  contracted_amount numeric,
  income_transaction_id uuid,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  discount text,
  discount_type text DEFAULT 'percent'::text CHECK (discount_type = ANY (ARRAY['percent'::text, 'money'::text])),
  discount_applied boolean DEFAULT false,
  forma_pagamento text,
  valor_recebido numeric,
  taxa_matricula_recebido numeric,
  pix_completed boolean DEFAULT false,
  contract_signed boolean DEFAULT false,
  payment_proof_url text,
  contract_url text,
  professor_proof_url text,
  board_status text NOT NULL DEFAULT 'matriculado'::text,
  name text,
  photo text,
  responsible text,
  vendas numeric NOT NULL DEFAULT 0,
  taxa_matricula_paid_at timestamp with time zone,
  valor_recebido_paid_at timestamp with time zone,
  responsavel_usuario_id uuid NOT NULL,
  seller_origin text CHECK (seller_origin = ANY (ARRAY['target'::text, 'pluppex'::text])),
  responsible_id uuid,
  cost_center text DEFAULT 'cursos'::text CHECK (cost_center = ANY (ARRAY['cursos'::text, 'servico_drone'::text, 'administrativo'::text])),
  CONSTRAINT lead_class_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT lead_class_enrollments_responsavel_usuario_id_fkey FOREIGN KEY (responsavel_usuario_id) REFERENCES public.perfis(id),
  CONSTRAINT lead_class_enrollments_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES public.perfis(id),
  CONSTRAINT lead_class_enrollments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT lead_class_enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.turmas(id),
  CONSTRAINT lead_class_enrollments_transfer_to_class_id_fkey FOREIGN KEY (transfer_to_class_id) REFERENCES public.turmas(id),
  CONSTRAINT lead_class_enrollments_income_transaction_id_fkey FOREIGN KEY (income_transaction_id) REFERENCES public.financial_transactions(id),
  CONSTRAINT lead_class_enrollments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  product text,
  value numeric DEFAULT 0,
  stars numeric DEFAULT 0,
  pipeline_id uuid,
  stage_id uuid,
  company_id uuid,
  name text NOT NULL,
  email text,
  phone text,
  city text,
  cnpj text,
  responsible text,
  status text DEFAULT 'new'::text,
  substatus text,
  photo text,
  last_contact_at timestamp with time zone,
  motivo_perda text,
  lead_source text,
  responsavel_usuario_id uuid NOT NULL,
  deletado_em timestamp with time zone,
  deletado_por uuid,
  seller_origin text CHECK (seller_origin = ANY (ARRAY['target'::text, 'pluppex'::text])),
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id),
  CONSTRAINT leads_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.pipeline_stages(id),
  CONSTRAINT leads_responsavel_usuario_id_fkey FOREIGN KEY (responsavel_usuario_id) REFERENCES public.perfis(id),
  CONSTRAINT leads_deletado_por_fkey FOREIGN KEY (deletado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.logs_sistema (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tabela_nome text NOT NULL,
  registro_id uuid NOT NULL,
  acao text NOT NULL,
  dados_antigos jsonb,
  dados_novos jsonb,
  usuario_id uuid,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT logs_sistema_pkey PRIMARY KEY (id),
  CONSTRAINT logs_sistema_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id)
);
CREATE TABLE public.matriculas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  turma_id uuid NOT NULL,
  status text DEFAULT 'MATRICULADO'::text CHECK (status = ANY (ARRAY['MATRICULADO'::text, 'CONFIRMADO'::text, 'TRANSFERIDO'::text, 'CANCELADO'::text, 'CONCLUIDO'::text])),
  criado_por uuid,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  deletado_em timestamp with time zone,
  deletado_por uuid,
  CONSTRAINT matriculas_pkey PRIMARY KEY (id),
  CONSTRAINT matriculas_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT matriculas_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id),
  CONSTRAINT matriculas_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id),
  CONSTRAINT matriculas_deletado_por_fkey FOREIGN KEY (deletado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.movimentacoes_financeiras (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transacao_financeira_id uuid NOT NULL,
  tipo_movimentacao text NOT NULL CHECK (tipo_movimentacao = ANY (ARRAY['PAGAMENTO'::text, 'DESCONTO'::text, 'TAXA'::text, 'COMISSAO'::text, 'ESTORNO'::text, 'TRANSFERENCIA'::text])),
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  criado_por uuid,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT movimentacoes_financeiras_pkey PRIMARY KEY (id),
  CONSTRAINT movimentacoes_financeiras_transacao_financeira_id_fkey FOREIGN KEY (transacao_financeira_id) REFERENCES public.financial_transactions(id),
  CONSTRAINT movimentacoes_financeiras_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.normalizacao_pendencias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tabela_nome text NOT NULL,
  registro_id uuid NOT NULL,
  campo text NOT NULL,
  valor_original text,
  motivo text NOT NULL,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  resolvido boolean NOT NULL DEFAULT false,
  resolvido_em timestamp with time zone,
  CONSTRAINT normalizacao_pendencias_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  content text NOT NULL,
  lead_id uuid,
  author_name text,
  author_id uuid NOT NULL,
  CONSTRAINT notes_pkey PRIMARY KEY (id),
  CONSTRAINT notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.perfis(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  type text CHECK (type = ANY (ARRAY['urgent'::text, 'pending'::text, 'info'::text, 'success'::text, 'system'::text])),
  category text CHECK (category = ANY (ARRAY['user'::text, 'system'::text])),
  read boolean DEFAULT false,
  link text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_on date,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.pagamentos_matriculas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  matricula_id uuid NOT NULL,
  transacao_financeira_id uuid,
  forma_pagamento text,
  valor_bruto numeric DEFAULT 0,
  valor_desconto numeric DEFAULT 0,
  valor_final numeric DEFAULT 0,
  pago_em timestamp with time zone,
  status text DEFAULT 'PENDENTE'::text CHECK (status = ANY (ARRAY['PENDENTE'::text, 'PAGO'::text, 'CANCELADO'::text])),
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT pagamentos_matriculas_pkey PRIMARY KEY (id),
  CONSTRAINT pagamentos_matriculas_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id),
  CONSTRAINT pagamentos_matriculas_transacao_financeira_id_fkey FOREIGN KEY (transacao_financeira_id) REFERENCES public.financial_transactions(id)
);
CREATE TABLE public.partner_rules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  origin_type text NOT NULL CHECK (origin_type = ANY (ARRAY['TARGET'::text, 'PLUPPEX'::text])),
  technology_fee_percent numeric DEFAULT 0,
  fixed_fee numeric DEFAULT 0,
  category_id uuid,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT partner_rules_pkey PRIMARY KEY (id),
  CONSTRAINT partner_rules_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.financial_categories(id)
);
CREATE TABLE public.perfis (
  id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  name text,
  email text,
  phone text,
  department text,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text])),
  cpf text,
  avatar_url text,
  role_id uuid,
  must_change_password boolean NOT NULL DEFAULT false,
  in_round_robin boolean DEFAULT true,
  CONSTRAINT perfis_pkey PRIMARY KEY (id),
  CONSTRAINT perfis_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.cargos(id),
  CONSTRAINT perfis_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.pipeline_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pipeline_id uuid,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3B82F6'::text,
  position integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pipeline_stages_pkey PRIMARY KEY (id),
  CONSTRAINT pipeline_stages_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id)
);
CREATE TABLE public.pipelines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  company_id uuid,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pipelines_pkey PRIMARY KEY (id),
  CONSTRAINT pipelines_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.squad_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  squad_id uuid,
  user_id uuid,
  role_type text CHECK (role_type = ANY (ARRAY['CLOSER'::text, 'SDR'::text])),
  active boolean DEFAULT true,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  left_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT squad_members_pkey PRIMARY KEY (id),
  CONSTRAINT squad_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.perfis(id),
  CONSTRAINT squad_members_squad_id_fkey FOREIGN KEY (squad_id) REFERENCES public.squads(id),
  CONSTRAINT squad_members_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT squad_members_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.squads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  manager_id uuid,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  color text DEFAULT '#6366f1'::text,
  logo_url text,
  CONSTRAINT squads_pkey PRIMARY KEY (id),
  CONSTRAINT squads_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT squads_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text])),
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  lead_id uuid,
  category text DEFAULT 'Geral'::text,
  scheduled_time text,
  responsavel_usuario_id uuid,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT tasks_responsavel_usuario_id_fkey FOREIGN KEY (responsavel_usuario_id) REFERENCES public.perfis(id)
);
CREATE TABLE public.time_clock_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['entrada'::text, 'saida_intervalo'::text, 'volta_intervalo'::text, 'saida'::text])),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  location text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT time_clock_records_pkey PRIMARY KEY (id),
  CONSTRAINT time_clock_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.perfis(id)
);
CREATE TABLE public.time_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['entrada'::text, 'saida_intervalo'::text, 'volta_intervalo'::text, 'saida'::text])),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  location_lat numeric,
  location_lng numeric,
  location_address text,
  ip_address text,
  device_info text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT time_logs_pkey PRIMARY KEY (id),
  CONSTRAINT time_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.turmas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  name text NOT NULL,
  professor_name text,
  professor_email text,
  date date,
  time text,
  location text,
  status text DEFAULT 'agendada'::text CHECK (status = ANY (ARRAY['agendada'::text, 'em_andamento'::text, 'concluida'::text, 'cancelada'::text])),
  price numeric DEFAULT 0,
  enrollment_fee numeric,
  description text,
  category text,
  image_url text,
  student_goal integer,
  instructor_cost numeric DEFAULT 0,
  is_processed_finance boolean DEFAULT false,
  CONSTRAINT turmas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_compensation_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  role_type text NOT NULL CHECK (role_type = ANY (ARRAY['CLOSER'::text, 'SDR'::text, 'MANAGER'::text])),
  level text NOT NULL,
  active boolean DEFAULT true,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_compensation_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_compensation_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.vendas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  matricula_id uuid,
  lead_id uuid,
  vendedor_id uuid NOT NULL,
  valor_total numeric DEFAULT 0,
  valor_desconto numeric DEFAULT 0,
  valor_final numeric DEFAULT 0,
  status text DEFAULT 'PENDENTE'::text CHECK (status = ANY (ARRAY['PENDENTE'::text, 'PAGO'::text, 'CANCELADO'::text])),
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT vendas_pkey PRIMARY KEY (id),
  CONSTRAINT vendas_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id),
  CONSTRAINT vendas_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT vendas_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.perfis(id)
);-- Migration 022: Finance Module Implementation (Phases 1, 2, 3)
-- Based on the Implementation Report May 2026

-- ============================================================
-- PHASE 1: Schema Updates
-- ============================================================

-- 1. Add missing columns to lead_class_enrollments
ALTER TABLE lead_class_enrollments 
  ADD COLUMN IF NOT EXISTS responsible TEXT,
  ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES perfis(id),
  ADD COLUMN IF NOT EXISTS seller_origin TEXT CHECK (seller_origin IN ('target', 'pluppex')),
  ADD COLUMN IF NOT EXISTS cost_center TEXT CHECK (cost_center IN ('cursos','servico_drone','administrativo')) DEFAULT 'cursos',
  ADD COLUMN IF NOT EXISTS valor_recebido NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_recebido_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS taxa_matricula_recebido NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_matricula_paid_at TIMESTAMPTZ;

-- 2. Add columns to leads
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS seller_origin TEXT CHECK (seller_origin IN ('target', 'pluppex'));

-- 3. Add columns to financial_transactions
ALTER TABLE financial_transactions 
  ADD COLUMN IF NOT EXISTS cost_center TEXT CHECK (cost_center IN ('cursos','servico_drone','administrativo'));

-- 4. Add columns to turmas
ALTER TABLE turmas 
  ADD COLUMN IF NOT EXISTS instructor_cost NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_processed_finance BOOLEAN DEFAULT FALSE;

-- 5. Add constraints for data integrity (Item #04)
ALTER TABLE lead_class_enrollments 
  DROP CONSTRAINT IF EXISTS chk_paid_date;
ALTER TABLE lead_class_enrollments 
  ADD CONSTRAINT chk_paid_date 
  CHECK (valor_recebido IS NULL OR valor_recebido = 0 OR valor_recebido_paid_at IS NOT NULL);

-- 6. Correct partner_rules (Item #05)
UPDATE partner_rules SET fixed_fee = 0 WHERE origin_type = 'PLUPPEX';

-- ============================================================
-- PHASE 2: Triggers
-- ============================================================

-- 2A: Pipeline Ganho -> Receita Automática (with partner_origin detection)
CREATE OR REPLACE FUNCTION fn_pipeline_to_revenue()
RETURNS TRIGGER AS $$
DECLARE
    v_category_id UUID;
    v_amount NUMERIC;
    v_is_won BOOLEAN := false;
    v_user_id UUID := NULL;
    v_partner_origin TEXT := 'TARGET';
    v_desc TEXT;
BEGIN
    -- Determine if lead is WON
    IF NEW.status IN ('closed', 'ganho', 'fechado', 'aprovado') AND 
       (OLD.status IS NULL OR OLD.status NOT IN ('closed', 'ganho', 'fechado', 'aprovado')) THEN
        v_is_won := true;
    END IF;

    IF v_is_won THEN
        v_desc := 'Receita Automática - Lead: ' || NEW.name;

        SELECT id INTO v_category_id FROM financial_categories WHERE name = 'Venda de Curso' LIMIT 1;
        
        BEGIN
            v_amount := CAST(NULLIF(regexp_replace(NEW.value::text, '[^0-9.]', '', 'g'), '') AS NUMERIC);
        EXCEPTION WHEN OTHERS THEN
            v_amount := 0;
        END;

        -- Find user and determine squad origin
        IF NEW.responsible_id IS NOT NULL THEN
            v_user_id := NEW.responsible_id;
        ELSIF NEW.responsible IS NOT NULL AND trim(NEW.responsible) != '' THEN
            SELECT id INTO v_user_id FROM perfis 
            WHERE lower(trim(name)) = lower(trim(NEW.responsible)) LIMIT 1;
        END IF;

        IF v_user_id IS NOT NULL THEN
            -- Check if user belongs to a Pluppex squad
            IF EXISTS (
                SELECT 1 FROM squad_members sm
                JOIN squads s ON sm.squad_id = s.id
                WHERE sm.user_id = v_user_id AND UPPER(s.name) LIKE '%PLUPPEX%' AND sm.active = true
            ) THEN
                v_partner_origin := 'PLUPPEX';
            END IF;
        END IF;

        -- UPSERT transaction
        INSERT INTO financial_transactions (
            description, amount, type, status, category_id, lead_id, user_id, origin_type, partner_origin, cost_center
        ) VALUES (
            v_desc, COALESCE(v_amount, 0), 'INCOME', 'PENDING', v_category_id, NEW.id, v_user_id, 'PIPELINE', v_partner_origin, 
            CASE WHEN NEW.product ILIKE '%drone%' THEN 'servico_drone' ELSE 'cursos' END
        )
        ON CONFLICT (lead_id) WHERE origin_type = 'PIPELINE' AND type = 'INCOME'
        DO UPDATE SET 
            amount = EXCLUDED.amount,
            partner_origin = EXCLUDED.partner_origin,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2B: Pagamento (Receita) -> BPO Pluppex/Comissão (Item #05)
CREATE OR REPLACE FUNCTION fn_payment_to_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_category_id UUID;
    v_partner_category_id UUID;
    v_bpo_amount NUMERIC;
BEGIN
    IF NEW.type = 'INCOME' AND NEW.status = 'PAID' AND OLD.status != 'PAID' THEN
        
        SELECT id INTO v_commission_category_id FROM financial_categories WHERE name = 'Comissão de Vendedores' LIMIT 1;
        SELECT id INTO v_partner_category_id FROM financial_categories WHERE name = 'Repasse de Parceiros' LIMIT 1;

        -- Calculate BPO if it's a pipeline/enrollment revenue
        IF NEW.origin_type IN ('PIPELINE', 'CLASS') THEN
            -- BPO Logic: Target 8%, Pluppex 18%
            v_bpo_amount := CASE 
                WHEN NEW.partner_origin = 'TARGET' THEN NEW.amount * 0.08
                WHEN NEW.partner_origin = 'PLUPPEX' THEN NEW.amount * 0.18
                ELSE 0 
            END;

            IF v_bpo_amount > 0 THEN
                INSERT INTO financial_transactions (
                    description, amount, type, status, category_id, lead_id, user_id, source_transaction_id, origin_type, partner_origin, cost_center
                ) VALUES (
                    'BPO Pluppex - Ref: ' || NEW.description, v_bpo_amount, 'EXPENSE', 'PENDING', v_partner_category_id, NEW.lead_id, NEW.user_id, NEW.id, 'PARTNER', NEW.partner_origin, NEW.cost_center
                )
                ON CONFLICT (source_transaction_id) WHERE origin_type = 'PARTNER'
                DO UPDATE SET amount = EXCLUDED.amount, updated_at = NOW();
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2C: Turma Concluída -> Custo Instrutor (CSP) (Item #10)
CREATE OR REPLACE FUNCTION fn_turma_to_csp()
RETURNS TRIGGER AS $$
DECLARE
    v_csp_category_id UUID;
BEGIN
    IF NEW.status = 'concluida' AND OLD.status != 'concluida' AND NEW.instructor_cost > 0 THEN
        SELECT id INTO v_csp_category_id FROM financial_categories WHERE dre_group = 'CSP' LIMIT 1;
        
        INSERT INTO financial_transactions (
            description, amount, type, status, origin_type, class_id, category_id, cost_center
        ) VALUES (
            'CSP - Instrutor: ' || NEW.name, NEW.instructor_cost, 'EXPENSE', 'PENDING', 'CLASS', NEW.id, v_csp_category_id, 'cursos'
        );
        
        NEW.is_processed_finance := TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_turma_to_csp ON turmas;
CREATE TRIGGER trg_turma_to_csp
    BEFORE UPDATE ON turmas
    FOR EACH ROW
    EXECUTE FUNCTION fn_turma_to_csp();

-- ============================================================
-- PHASE 3: Views and RPCs
-- ============================================================

-- 3A: v_dre_receita (Source of Truth for Revenue)
CREATE OR REPLACE VIEW v_dre_receita AS
SELECT
  'PIPELINE' AS origem,
  ft.payment_date::DATE AS data,
  ft.amount AS valor,
  ft.category_id,
  fc.dre_group,
  ft.cost_center
FROM financial_transactions ft
LEFT JOIN financial_categories fc ON ft.category_id = fc.id
WHERE ft.type = 'INCOME' AND ft.status = 'PAID'

UNION ALL

SELECT
  'MATRICULA' AS origem,
  COALESCE(lce.valor_recebido_paid_at::DATE, lce.enrolled_at::DATE) AS data,
  (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) AS valor,
  NULL AS category_id,
  'RECEITA_BRUTA' AS dre_group,
  COALESCE(lce.cost_center, 'cursos') AS cost_center
FROM lead_class_enrollments lce
WHERE lce.status != 'CANCELLED'
  AND lce.income_transaction_id IS NULL
  AND (lce.valor_recebido > 0 OR lce.taxa_matricula_recebido > 0);

-- 3B: v_pluppex_bpo_by_class
CREATE OR REPLACE VIEW v_pluppex_bpo_by_class AS
SELECT
  lce.class_id,
  t.name AS turma_name,
  SUM(CASE WHEN lce.seller_origin = 'target' THEN (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) * 0.08 ELSE 0 END) AS bpo_target,
  SUM(CASE WHEN lce.seller_origin = 'pluppex' THEN (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) * 0.18 ELSE 0 END) AS bpo_pluppex,
  SUM(CASE WHEN lce.seller_origin = 'target' 
      THEN (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) * 0.08 
      ELSE (COALESCE(lce.valor_recebido, 0) + COALESCE(lce.taxa_matricula_recebido, 0)) * 0.18 END) AS total_bpo
FROM lead_class_enrollments lce
JOIN turmas t ON t.id = lce.class_id
WHERE lce.status != 'CANCELLED'
GROUP BY lce.class_id, t.name;

-- 3C: get_dashboard_kpis (RPC)
CREATE OR REPLACE FUNCTION get_dashboard_kpis(p_start_date DATE, p_end_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_recebido NUMERIC;
    v_total_despesa NUMERIC;
    v_contas_a_receber NUMERIC;
    v_lucro NUMERIC;
BEGIN
    -- 1. Total Recebido (Unified)
    SELECT COALESCE(SUM(valor), 0) INTO v_total_recebido
    FROM v_dre_receita
    WHERE data BETWEEN p_start_date AND p_end_date;

    -- 2. Total Despesa
    SELECT COALESCE(SUM(amount), 0) INTO v_total_despesa
    FROM financial_transactions
    WHERE type = 'EXPENSE' AND status = 'PAID'
    AND payment_date BETWEEN p_start_date AND p_end_date;

    -- 3. Contas a Receber (Item #02)
    -- Pipeline PENDING + LCE Unpaid (Contracted - Received)
    SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions WHERE type = 'INCOME' AND status = 'PENDING') +
        (SELECT COALESCE(SUM(contracted_amount - COALESCE(valor_recebido, 0)), 0) FROM lead_class_enrollments WHERE status != 'CANCELLED' AND (contracted_amount > COALESCE(valor_recebido, 0)))
    INTO v_contas_a_receber;

    v_lucro := v_total_recebido - v_total_despesa;

    RETURN jsonb_build_object(
        'total_recebido', v_total_recebido,
        'total_despesa', v_total_despesa,
        'contas_a_receber', v_contas_a_receber,
        'lucro', v_lucro
    );
END;
$$;
