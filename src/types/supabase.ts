export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      anexos: {
        Row: {
          criado_em: string | null
          enviado_por: string | null
          id: string
          nome_arquivo: string | null
          referencia_id: string
          tipo_arquivo: string | null
          tipo_referencia: string
          url_arquivo: string
        }
        Insert: {
          criado_em?: string | null
          enviado_por?: string | null
          id?: string
          nome_arquivo?: string | null
          referencia_id: string
          tipo_arquivo?: string | null
          tipo_referencia: string
          url_arquivo: string
        }
        Update: {
          criado_em?: string | null
          enviado_por?: string | null
          id?: string
          nome_arquivo?: string | null
          referencia_id?: string
          tipo_arquivo?: string | null
          tipo_referencia?: string
          url_arquivo?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          called_at: string
          created_at: string
          id: string
          lead_id: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          called_at?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          called_at?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          permissions: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          permissions?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          permissions?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      centro_custos: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      commission_results: {
        Row: {
          accelerator_amount: number | null
          achievement_percent: number | null
          bonus_amount: number | null
          created_at: string | null
          created_by: string | null
          fixed_amount: number | null
          id: string
          level: string | null
          paid_at: string | null
          period_month: string
          realized_enrollments: number | null
          realized_revenue: number | null
          realized_sql: number | null
          role_type: string
          semaphore_status: string | null
          special_bonus_amount: number | null
          squad_id: string | null
          status: string | null
          target_revenue: number | null
          total_amount: number | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          variable_amount: number | null
        }
        Insert: {
          accelerator_amount?: number | null
          achievement_percent?: number | null
          bonus_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          fixed_amount?: number | null
          id?: string
          level?: string | null
          paid_at?: string | null
          period_month: string
          realized_enrollments?: number | null
          realized_revenue?: number | null
          realized_sql?: number | null
          role_type: string
          semaphore_status?: string | null
          special_bonus_amount?: number | null
          squad_id?: string | null
          status?: string | null
          target_revenue?: number | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          variable_amount?: number | null
        }
        Update: {
          accelerator_amount?: number | null
          achievement_percent?: number | null
          bonus_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          fixed_amount?: number | null
          id?: string
          level?: string | null
          paid_at?: string | null
          period_month?: string
          realized_enrollments?: number | null
          realized_revenue?: number | null
          realized_sql?: number | null
          role_type?: string
          semaphore_status?: string | null
          special_bonus_amount?: number | null
          squad_id?: string | null
          status?: string | null
          target_revenue?: number | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          variable_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_results_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          accelerator_amount: number
          active: boolean | null
          bonus_per_enrollment: number | null
          created_at: string | null
          created_by: string | null
          fixed_amount: number
          id: string
          level: string
          role_type: string | null
          target_quantity: number | null
          target_revenue: number
          target_sql: number | null
          updated_at: string | null
          updated_by: string | null
          variable_amount: number
        }
        Insert: {
          accelerator_amount?: number
          active?: boolean | null
          bonus_per_enrollment?: number | null
          created_at?: string | null
          created_by?: string | null
          fixed_amount?: number
          id?: string
          level: string
          role_type?: string | null
          target_quantity?: number | null
          target_revenue?: number
          target_sql?: number | null
          updated_at?: string | null
          updated_by?: string | null
          variable_amount?: number
        }
        Update: {
          accelerator_amount?: number
          active?: boolean | null
          bonus_per_enrollment?: number | null
          created_at?: string | null
          created_by?: string | null
          fixed_amount?: number
          id?: string
          level?: string
          role_type?: string | null
          target_quantity?: number | null
          target_revenue?: number
          target_sql?: number | null
          updated_at?: string | null
          updated_by?: string | null
          variable_amount?: number
        }
        Relationships: []
      }
      copilot_sessions: {
        Row: {
          bant: Json
          commercial: Json
          created_at: string
          id: string
          lead_id: string
          objections: Json
          suggestions: Json
          summary: string | null
          transcript: Json
          urgent_alert: string | null
          user_id: string | null
        }
        Insert: {
          bant?: Json
          commercial?: Json
          created_at?: string
          id?: string
          lead_id: string
          objections?: Json
          suggestions?: Json
          summary?: string | null
          transcript?: Json
          urgent_alert?: string | null
          user_id?: string | null
        }
        Update: {
          bant?: Json
          commercial?: Json
          created_at?: string
          id?: string
          lead_id?: string
          objections?: Json
          suggestions?: Json
          summary?: string | null
          transcript?: Json
          urgent_alert?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copilot_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_completo"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          value?: Json
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          created_at: string | null
          created_by: string | null
          dre_group: string
          id: string
          is_system: boolean | null
          name: string
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dre_group: string
          id?: string
          is_system?: boolean | null
          name: string
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dre_group?: string
          id?: string
          is_system?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          cancellation_reason: string | null
          cancelled_at: string | null
          category_id: string | null
          centro_custo_id: string | null
          class_id: string | null
          cost_center: string | null
          created_at: string | null
          created_by: string | null
          deletado_em: string | null
          deletado_por: string | null
          description: string
          due_date: string | null
          id: string
          lead_id: string | null
          origin_type: string | null
          partner_origin: string | null
          payment_date: string | null
          referencia_id: string | null
          source_transaction_id: string | null
          status: string
          tipo_referencia: string | null
          type: string
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category_id?: string | null
          centro_custo_id?: string | null
          class_id?: string | null
          cost_center?: string | null
          created_at?: string | null
          created_by?: string | null
          deletado_em?: string | null
          deletado_por?: string | null
          description: string
          due_date?: string | null
          id?: string
          lead_id?: string | null
          origin_type?: string | null
          partner_origin?: string | null
          payment_date?: string | null
          referencia_id?: string | null
          source_transaction_id?: string | null
          status: string
          tipo_referencia?: string | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category_id?: string | null
          centro_custo_id?: string | null
          class_id?: string | null
          cost_center?: string | null
          created_at?: string | null
          created_by?: string | null
          deletado_em?: string | null
          deletado_por?: string | null
          description?: string
          due_date?: string | null
          id?: string
          lead_id?: string | null
          origin_type?: string | null
          partner_origin?: string | null
          payment_date?: string | null
          referencia_id?: string | null
          source_transaction_id?: string | null
          status?: string
          tipo_referencia?: string | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_padrao"
            referencedColumns: ["categoria_id"]
          },
          {
            foreignKeyName: "financial_transactions_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centro_custos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_padrao"
            referencedColumns: ["centro_custo_id"]
          },
          {
            foreignKeyName: "financial_transactions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_dre_despesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_padrao"
            referencedColumns: ["transacao_id"]
          },
          {
            foreignKeyName: "financial_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      form_configs: {
        Row: {
          active: boolean
          badge_label: string
          form_key: string
          price: number
          product: string
          title: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          active?: boolean
          badge_label?: string
          form_key: string
          price?: number
          product: string
          title: string
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          active?: boolean
          badge_label?: string
          form_key?: string
          price?: number
          product?: string
          title?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          calls_goal: number | null
          created_at: string | null
          id: string
          leads_goal: number
          revenue_goal: number
          seller_id: string | null
          seller_name: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          calls_goal?: number | null
          created_at?: string | null
          id?: string
          leads_goal?: number
          revenue_goal?: number
          seller_id?: string | null
          seller_name?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          calls_goal?: number | null
          created_at?: string | null
          id?: string
          leads_goal?: number
          revenue_goal?: number
          seller_id?: string | null
          seller_name?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_status: {
        Row: {
          alterado_por: string | null
          criado_em: string | null
          id: string
          observacao: string | null
          referencia_id: string
          status_antigo: string | null
          status_novo: string | null
          tipo_referencia: string
        }
        Insert: {
          alterado_por?: string | null
          criado_em?: string | null
          id?: string
          observacao?: string | null
          referencia_id: string
          status_antigo?: string | null
          status_novo?: string | null
          tipo_referencia: string
        }
        Update: {
          alterado_por?: string | null
          criado_em?: string | null
          id?: string
          observacao?: string | null
          referencia_id?: string
          status_antigo?: string | null
          status_novo?: string | null
          tipo_referencia?: string
        }
        Relationships: []
      }
      lead_class_enrollments: {
        Row: {
          board_status: string
          cancellation_reason: string | null
          centro_custo_id: string | null
          class_id: string
          completed_at: string | null
          confirmed_at: string | null
          contract_signed: boolean | null
          contract_url: string | null
          contracted_amount: number | null
          cost_center: string | null
          created_at: string
          created_by: string | null
          discount: string | null
          discount_applied: boolean | null
          discount_type: string | null
          enrolled_at: string
          forma_pagamento: string | null
          id: string
          income_transaction_id: string | null
          lead_id: string
          name: string | null
          notes: string | null
          payment_proof_url: string | null
          photo: string | null
          pix_completed: boolean | null
          professor_proof_url: string | null
          profile_photo_url: string | null
          refund_status: string
          removed_at: string | null
          responsavel_usuario_id: string
          responsible: string | null
          responsible_id: string | null
          rg_photo_url: string | null
          seller_origin: string | null
          status: string
          taxa_matricula_paid_at: string | null
          taxa_matricula_recebido: number | null
          transfer_to_class_id: string | null
          transferred_at: string | null
          updated_at: string
          valor_recebido: number | null
          valor_recebido_paid_at: string | null
          vendas: number
        }
        Insert: {
          board_status?: string
          cancellation_reason?: string | null
          centro_custo_id?: string | null
          class_id: string
          completed_at?: string | null
          confirmed_at?: string | null
          contract_signed?: boolean | null
          contract_url?: string | null
          contracted_amount?: number | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          discount?: string | null
          discount_applied?: boolean | null
          discount_type?: string | null
          enrolled_at?: string
          forma_pagamento?: string | null
          id?: string
          income_transaction_id?: string | null
          lead_id: string
          name?: string | null
          notes?: string | null
          payment_proof_url?: string | null
          photo?: string | null
          pix_completed?: boolean | null
          professor_proof_url?: string | null
          profile_photo_url?: string | null
          refund_status?: string
          removed_at?: string | null
          responsavel_usuario_id: string
          responsible?: string | null
          responsible_id?: string | null
          rg_photo_url?: string | null
          seller_origin?: string | null
          status?: string
          taxa_matricula_paid_at?: string | null
          taxa_matricula_recebido?: number | null
          transfer_to_class_id?: string | null
          transferred_at?: string | null
          updated_at?: string
          valor_recebido?: number | null
          valor_recebido_paid_at?: string | null
          vendas?: number
        }
        Update: {
          board_status?: string
          cancellation_reason?: string | null
          centro_custo_id?: string | null
          class_id?: string
          completed_at?: string | null
          confirmed_at?: string | null
          contract_signed?: boolean | null
          contract_url?: string | null
          contracted_amount?: number | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          discount?: string | null
          discount_applied?: boolean | null
          discount_type?: string | null
          enrolled_at?: string
          forma_pagamento?: string | null
          id?: string
          income_transaction_id?: string | null
          lead_id?: string
          name?: string | null
          notes?: string | null
          payment_proof_url?: string | null
          photo?: string | null
          pix_completed?: boolean | null
          professor_proof_url?: string | null
          profile_photo_url?: string | null
          refund_status?: string
          removed_at?: string | null
          responsavel_usuario_id?: string
          responsible?: string | null
          responsible_id?: string | null
          rg_photo_url?: string | null
          seller_origin?: string | null
          status?: string
          taxa_matricula_paid_at?: string | null
          taxa_matricula_recebido?: number | null
          transfer_to_class_id?: string | null
          transferred_at?: string | null
          updated_at?: string
          valor_recebido?: number | null
          valor_recebido_paid_at?: string | null
          vendas?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_class_enrollments_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centro_custos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_class_enrollments_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_padrao"
            referencedColumns: ["centro_custo_id"]
          },
          {
            foreignKeyName: "lead_class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_class_enrollments_income_transaction_id_fkey"
            columns: ["income_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_class_enrollments_income_transaction_id_fkey"
            columns: ["income_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_dre_despesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_class_enrollments_income_transaction_id_fkey"
            columns: ["income_transaction_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_padrao"
            referencedColumns: ["transacao_id"]
          },
          {
            foreignKeyName: "lead_class_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_class_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_class_enrollments_responsavel_usuario_id_fkey"
            columns: ["responsavel_usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_class_enrollments_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_class_enrollments_transfer_to_class_id_fkey"
            columns: ["transfer_to_class_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          centro_custo_id: string | null
          city: string | null
          cnpj: string | null
          company_id: string | null
          contract_signed: boolean | null
          contract_url: string | null
          cost_center: string | null
          cpf: string | null
          created_at: string | null
          deletado_em: string | null
          deletado_por: string | null
          discount_applied: boolean | null
          discount_type: string | null
          email: string | null
          emergency_contact: string | null
          guardian_cpf: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          instagram: string | null
          is_minor: boolean | null
          last_contact_at: string | null
          lead_source: string | null
          motivo_perda: string | null
          name: string
          payment_proof_url: string | null
          phone: string | null
          photo: string | null
          pipeline_id: string | null
          pix_completed: boolean | null
          product: string | null
          professor_proof_url: string | null
          profile_photo_url: string | null
          responsavel_usuario_id: string
          responsible: string | null
          rg_photo_url: string | null
          seller_origin: string | null
          stage_id: string | null
          stars: number | null
          status: string | null
          substatus: string | null
          taxa_matricula_paid_at: string | null
          updated_at: string | null
          valor_recebido_paid_at: string | null
          value: number | null
          won_at: string | null
        }
        Insert: {
          address?: string | null
          centro_custo_id?: string | null
          city?: string | null
          cnpj?: string | null
          company_id?: string | null
          contract_signed?: boolean | null
          contract_url?: string | null
          cost_center?: string | null
          cpf?: string | null
          created_at?: string | null
          deletado_em?: string | null
          deletado_por?: string | null
          discount_applied?: boolean | null
          discount_type?: string | null
          email?: string | null
          emergency_contact?: string | null
          guardian_cpf?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          instagram?: string | null
          is_minor?: boolean | null
          last_contact_at?: string | null
          lead_source?: string | null
          motivo_perda?: string | null
          name: string
          payment_proof_url?: string | null
          phone?: string | null
          photo?: string | null
          pipeline_id?: string | null
          pix_completed?: boolean | null
          product?: string | null
          professor_proof_url?: string | null
          profile_photo_url?: string | null
          responsavel_usuario_id: string
          responsible?: string | null
          rg_photo_url?: string | null
          seller_origin?: string | null
          stage_id?: string | null
          stars?: number | null
          status?: string | null
          substatus?: string | null
          taxa_matricula_paid_at?: string | null
          updated_at?: string | null
          valor_recebido_paid_at?: string | null
          value?: number | null
          won_at?: string | null
        }
        Update: {
          address?: string | null
          centro_custo_id?: string | null
          city?: string | null
          cnpj?: string | null
          company_id?: string | null
          contract_signed?: boolean | null
          contract_url?: string | null
          cost_center?: string | null
          cpf?: string | null
          created_at?: string | null
          deletado_em?: string | null
          deletado_por?: string | null
          discount_applied?: boolean | null
          discount_type?: string | null
          email?: string | null
          emergency_contact?: string | null
          guardian_cpf?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          instagram?: string | null
          is_minor?: boolean | null
          last_contact_at?: string | null
          lead_source?: string | null
          motivo_perda?: string | null
          name?: string
          payment_proof_url?: string | null
          phone?: string | null
          photo?: string | null
          pipeline_id?: string | null
          pix_completed?: boolean | null
          product?: string | null
          professor_proof_url?: string | null
          profile_photo_url?: string | null
          responsavel_usuario_id?: string
          responsible?: string | null
          rg_photo_url?: string | null
          seller_origin?: string | null
          stage_id?: string | null
          stars?: number | null
          status?: string | null
          substatus?: string | null
          taxa_matricula_paid_at?: string | null
          updated_at?: string | null
          valor_recebido_paid_at?: string | null
          value?: number | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centro_custos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_padrao"
            referencedColumns: ["centro_custo_id"]
          },
          {
            foreignKeyName: "leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipeline_leads_summary"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_responsavel_usuario_id_fkey"
            columns: ["responsavel_usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_leads_summary"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_sistema: {
        Row: {
          acao: string
          criado_em: string | null
          dados_antigos: Json | null
          dados_novos: Json | null
          id: string
          registro_id: string
          tabela_nome: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          criado_em?: string | null
          dados_antigos?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id: string
          tabela_nome: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string | null
          dados_antigos?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string
          tabela_nome?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      matriculas: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          criado_por: string | null
          deletado_em: string | null
          deletado_por: string | null
          id: string
          lead_id: string
          status: string | null
          turma_id: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          deletado_em?: string | null
          deletado_por?: string | null
          id?: string
          lead_id: string
          status?: string | null
          turma_id: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          deletado_em?: string | null
          deletado_por?: string | null
          id?: string
          lead_id?: string
          status?: string | null
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_financeiras: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          id: string
          tipo_movimentacao: string
          transacao_financeira_id: string
          valor: number
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          tipo_movimentacao: string
          transacao_financeira_id: string
          valor?: number
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          tipo_movimentacao?: string
          transacao_financeira_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_financeiras_transacao_financeira_id_fkey"
            columns: ["transacao_financeira_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_financeiras_transacao_financeira_id_fkey"
            columns: ["transacao_financeira_id"]
            isOneToOne: false
            referencedRelation: "v_dre_despesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_financeiras_transacao_financeira_id_fkey"
            columns: ["transacao_financeira_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_padrao"
            referencedColumns: ["transacao_id"]
          },
        ]
      }
      normalizacao_pendencias: {
        Row: {
          campo: string
          criado_em: string
          id: string
          motivo: string
          registro_id: string
          resolvido: boolean
          resolvido_em: string | null
          tabela_nome: string
          valor_original: string | null
        }
        Insert: {
          campo: string
          criado_em?: string
          id?: string
          motivo: string
          registro_id: string
          resolvido?: boolean
          resolvido_em?: string | null
          tabela_nome: string
          valor_original?: string | null
        }
        Update: {
          campo?: string
          criado_em?: string
          id?: string
          motivo?: string
          registro_id?: string
          resolvido?: boolean
          resolvido_em?: string | null
          tabela_nome?: string
          valor_original?: string | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          author_id: string
          author_name: string | null
          content: string
          created_at: string
          id: string
          lead_id: string | null
        }
        Insert: {
          author_id: string
          author_name?: string | null
          content: string
          created_at?: string
          id?: string
          lead_id?: string | null
        }
        Update: {
          author_id?: string
          author_name?: string | null
          content?: string
          created_at?: string
          id?: string
          lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string | null
          created_at: string
          created_on: string | null
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_on?: string | null
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_on?: string | null
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pagamentos_matriculas: {
        Row: {
          criado_em: string | null
          forma_pagamento: string | null
          id: string
          matricula_id: string
          pago_em: string | null
          status: string | null
          transacao_financeira_id: string | null
          valor_bruto: number | null
          valor_desconto: number | null
          valor_final: number | null
        }
        Insert: {
          criado_em?: string | null
          forma_pagamento?: string | null
          id?: string
          matricula_id: string
          pago_em?: string | null
          status?: string | null
          transacao_financeira_id?: string | null
          valor_bruto?: number | null
          valor_desconto?: number | null
          valor_final?: number | null
        }
        Update: {
          criado_em?: string | null
          forma_pagamento?: string | null
          id?: string
          matricula_id?: string
          pago_em?: string | null
          status?: string | null
          transacao_financeira_id?: string | null
          valor_bruto?: number | null
          valor_desconto?: number | null
          valor_final?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_matriculas_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_matriculas_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "vw_matriculas_completas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_matriculas_transacao_financeira_id_fkey"
            columns: ["transacao_financeira_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_matriculas_transacao_financeira_id_fkey"
            columns: ["transacao_financeira_id"]
            isOneToOne: false
            referencedRelation: "v_dre_despesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_matriculas_transacao_financeira_id_fkey"
            columns: ["transacao_financeira_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_padrao"
            referencedColumns: ["transacao_id"]
          },
        ]
      }
      partner_rules: {
        Row: {
          active: boolean | null
          category_id: string | null
          created_at: string | null
          fixed_fee: number | null
          id: string
          origin_type: string
          technology_fee_percent: number | null
          updated_at: string | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          fixed_fee?: number | null
          id?: string
          origin_type: string
          technology_fee_percent?: number | null
          updated_at?: string | null
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          fixed_fee?: number | null
          id?: string
          origin_type?: string
          technology_fee_percent?: number | null
          updated_at?: string | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_padrao"
            referencedColumns: ["categoria_id"]
          },
        ]
      }
      perfis: {
        Row: {
          allowed_products: string[] | null
          avatar_url: string | null
          cpf: string | null
          created_at: string
          department: string | null
          email: string | null
          id: string
          in_round_robin: boolean | null
          must_change_password: boolean
          name: string | null
          permissions_cache: Json | null
          phone: string | null
          role_id: string | null
          status: string | null
        }
        Insert: {
          allowed_products?: string[] | null
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id: string
          in_round_robin?: boolean | null
          must_change_password?: boolean
          name?: string | null
          permissions_cache?: Json | null
          phone?: string | null
          role_id?: string | null
          status?: string | null
        }
        Update: {
          allowed_products?: string[] | null
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          in_round_robin?: boolean | null
          must_change_password?: boolean
          name?: string | null
          permissions_cache?: Json | null
          phone?: string | null
          role_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfis_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string | null
          default_collapsed: boolean | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          pipeline_id: string | null
          position: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          default_collapsed?: boolean | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pipeline_id?: string | null
          position: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          default_collapsed?: boolean | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pipeline_id?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipeline_leads_summary"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      round_robin_state: {
        Row: {
          id: string
          last_seller_id: string | null
          last_seller_name: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          last_seller_id?: string | null
          last_seller_name?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          last_seller_id?: string | null
          last_seller_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_robin_state_last_seller_id_fkey"
            columns: ["last_seller_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_members: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          joined_at: string
          left_at: string | null
          role_type: string | null
          squad_id: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          role_type?: string | null
          squad_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          role_type?: string | null
          squad_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          active: boolean | null
          color: string | null
          company: string | null
          created_at: string | null
          created_by: string | null
          id: string
          logo_url: string | null
          manager_id: string | null
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          logo_url?: string | null
          manager_id?: string | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          logo_url?: string | null
          manager_id?: string | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      system_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          google_event_id: string | null
          id: string
          lead_id: string | null
          priority: string | null
          responsavel_usuario_id: string | null
          scheduled_time: string | null
          status: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          responsavel_usuario_id?: string | null
          scheduled_time?: string | null
          status?: string | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          responsavel_usuario_id?: string | null
          scheduled_time?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_responsavel_usuario_id_fkey"
            columns: ["responsavel_usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_records: {
        Row: {
          created_at: string
          id: string
          location: string | null
          notes: string | null
          timestamp: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          timestamp?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          timestamp?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          created_at: string | null
          device_info: string | null
          id: string
          ip_address: string | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          timestamp: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          timestamp?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          timestamp?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      turma_files: {
        Row: {
          created_at: string
          file_type: string
          id: string
          name: string
          size_bytes: number | null
          turma_id: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          file_type: string
          id?: string
          name: string
          size_bytes?: number | null
          turma_id: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          file_type?: string
          id?: string
          name?: string
          size_bytes?: number | null
          turma_id?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "turma_files_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          category: string | null
          category_id: string | null
          centro_custo_id: string | null
          cost_center: string | null
          created_at: string
          date: string | null
          description: string | null
          enrollment_fee: number | null
          id: string
          image_url: string | null
          instructor_cost: number | null
          is_processed_finance: boolean | null
          location: string | null
          name: string
          price: number | null
          professor_email: string | null
          professor_id: string | null
          professor_name: string | null
          status: string | null
          student_goal: number | null
          time: string | null
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          centro_custo_id?: string | null
          cost_center?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          enrollment_fee?: number | null
          id?: string
          image_url?: string | null
          instructor_cost?: number | null
          is_processed_finance?: boolean | null
          location?: string | null
          name: string
          price?: number | null
          professor_email?: string | null
          professor_id?: string | null
          professor_name?: string | null
          status?: string | null
          student_goal?: number | null
          time?: string | null
        }
        Update: {
          category?: string | null
          category_id?: string | null
          centro_custo_id?: string | null
          cost_center?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          enrollment_fee?: number | null
          id?: string
          image_url?: string | null
          instructor_cost?: number | null
          is_processed_finance?: boolean | null
          location?: string | null
          name?: string
          price?: number | null
          professor_email?: string | null
          professor_id?: string | null
          professor_name?: string | null
          status?: string | null
          student_goal?: number | null
          time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turmas_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centro_custos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_padrao"
            referencedColumns: ["centro_custo_id"]
          },
          {
            foreignKeyName: "turmas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          id: string
          titulo: string
          descricao: string | null
          url: string
          thumbnail_url: string | null
          tipo_curso: string
          finalidade: string
          duracao_seg: number | null
          ativo: boolean
          ordem: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titulo: string
          descricao?: string | null
          url: string
          thumbnail_url?: string | null
          tipo_curso?: string
          finalidade?: string
          duracao_seg?: number | null
          ativo?: boolean
          ordem?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          descricao?: string | null
          url?: string
          thumbnail_url?: string | null
          tipo_curso?: string
          finalidade?: string
          duracao_seg?: number | null
          ativo?: boolean
          ordem?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_compensation_profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          end_date: string | null
          id: string
          level: string
          role_type: string
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          level: string
          role_type: string
          start_date?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          level?: string
          role_type?: string
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          criado_em: string | null
          id: string
          lead_id: string | null
          matricula_id: string | null
          status: string | null
          valor_desconto: number | null
          valor_final: number | null
          valor_total: number | null
          vendedor_id: string
        }
        Insert: {
          criado_em?: string | null
          id?: string
          lead_id?: string | null
          matricula_id?: string | null
          status?: string | null
          valor_desconto?: number | null
          valor_final?: number | null
          valor_total?: number | null
          vendedor_id: string
        }
        Update: {
          criado_em?: string | null
          id?: string
          lead_id?: string | null
          matricula_id?: string | null
          status?: string | null
          valor_desconto?: number | null
          valor_final?: number | null
          valor_total?: number | null
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "vw_matriculas_completas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pipeline_leads_summary: {
        Row: {
          avg_stars: number | null
          lead_count: number | null
          pipeline_id: string | null
          pipeline_name: string | null
          position: number | null
          stage_id: string | null
          stage_name: string | null
          total_value: number | null
        }
        Relationships: []
      }
      v_bpo_pluppex: {
        Row: {
          bpo_pluppex_18pct: number | null
          bpo_target_8pct: number | null
          class_id: string | null
          total_bpo: number | null
          turma: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cashflow_by_cost_center: {
        Row: {
          cost_center: string | null
          status: string | null
          total: number | null
          type: string | null
        }
        Relationships: []
      }
      v_dre_despesas: {
        Row: {
          amount: number | null
          category_id: string | null
          category_name: string | null
          class_id: string | null
          cost_center: string | null
          data: string | null
          description: string | null
          dre_group: string | null
          id: string | null
          lead_id: string | null
          origin_type: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_padrao"
            referencedColumns: ["categoria_id"]
          },
          {
            foreignKeyName: "financial_transactions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_completo"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dre_receita: {
        Row: {
          categoria: string | null
          cost_center: string | null
          data: string | null
          origem: string | null
          valor: number | null
        }
        Relationships: []
      }
      v_leads_completo: {
        Row: {
          address: string | null
          centro_custo_id: string | null
          centro_custo_nome: string | null
          city: string | null
          cnpj: string | null
          company_id: string | null
          cost_center: string | null
          cpf: string | null
          created_at: string | null
          deletado_em: string | null
          deletado_por: string | null
          email: string | null
          emergency_contact: string | null
          id: string | null
          instagram: string | null
          last_contact_at: string | null
          lead_source: string | null
          motivo_perda: string | null
          name: string | null
          phone: string | null
          photo: string | null
          pipeline_id: string | null
          product: string | null
          profile_photo_url: string | null
          responsavel_nome: string | null
          responsavel_usuario_id: string | null
          responsible: string | null
          responsible_id: string | null
          rg_photo_url: string | null
          seller_origin: string | null
          stage_id: string | null
          stars: number | null
          status: string | null
          substatus: string | null
          updated_at: string | null
          value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centro_custos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_padrao"
            referencedColumns: ["centro_custo_id"]
          },
          {
            foreignKeyName: "leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipeline_leads_summary"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_responsavel_usuario_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_responsavel_usuario_id_fkey"
            columns: ["responsavel_usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_leads_summary"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      v_leads_duplicados: {
        Row: {
          email: string | null
          ids: string[] | null
          nomes: string[] | null
          total: number | null
        }
        Relationships: []
      }
      v_pluppex_bpo_by_class: {
        Row: {
          bpo_pluppex: number | null
          bpo_target: number | null
          class_id: string | null
          matriculas_pluppex: number | null
          matriculas_target: number | null
          total_bpo: number | null
          turma_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_financeiro_kpis_mensal: {
        Row: {
          competencia: string | null
          despesas: number | null
          receitas: number | null
          resultado: number | null
          total_transacoes: number | null
          transacoes_pagas: number | null
          transacoes_pendentes: number | null
        }
        Relationships: []
      }
      vw_financeiro_operacional_status: {
        Row: {
          indicador: string | null
          total: number | null
        }
        Relationships: []
      }
      vw_financeiro_padrao: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          categoria_id: string | null
          categoria_nome: string | null
          centro_custo_id: string | null
          centro_custo_nome: string | null
          created_at: string | null
          description: string | null
          dre_grupo: string | null
          due_date: string | null
          lead_id: string | null
          lead_nome: string | null
          origin_type: string | null
          partner_origin: string | null
          payment_date: string | null
          referencia_id: string | null
          status: string | null
          tipo: string | null
          tipo_referencia: string | null
          transacao_id: string | null
          turma_id: string | null
          turma_nome: string | null
          updated_at: string | null
          user_id: string | null
          usuario_nome: string | null
          valor: number | null
          valor_assinado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_class_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_matriculas_completas: {
        Row: {
          criado_em: string | null
          data_turma: string | null
          email: string | null
          id: string | null
          local_turma: string | null
          nome_lead: string | null
          nome_turma: string | null
          phone: string | null
          status: string | null
        }
        Relationships: []
      }
      vw_normalizacao_status: {
        Row: {
          indicador: string | null
          total: number | null
        }
        Relationships: []
      }
      vw_resumo_financeiro: {
        Row: {
          status: string | null
          tipo: string | null
          valor_total: number | null
        }
        Relationships: []
      }
      vw_time_logs_summary: {
        Row: {
          created_at: string | null
          device_info: string | null
          id: string | null
          ip_address: string | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          timestamp: string | null
          type: string | null
          user_department: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: []
      }
      vw_vendas: {
        Row: {
          cliente: string | null
          criado_em: string | null
          id: string | null
          status: string | null
          valor_desconto: number | null
          valor_final: number | null
          valor_total: number | null
          vendedor: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_ote_period: { Args: { p_period: string }; Returns: Json }
      check_is_admin: { Args: never; Returns: boolean }
      clean_old_notifications: { Args: never; Returns: undefined }
      fn_perfil_id_unico_por_nome: { Args: { p_nome: string }; Returns: string }
      fn_perfil_nome_por_id: { Args: { p_id: string }; Returns: string }
      get_dashboard_kpis: {
        Args: { p_end: string; p_start: string }
        Returns: {
          a_receber: number
          alunos_ganhos: number
          despesas: number
          lucro: number
          receita_realizada: number
        }[]
      }
      get_dre: {
        Args: { p_end: string; p_start: string }
        Returns: {
          categoria: string
          cost_center: string
          data: string
          origem: string
          valor: number
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      refresh_pipelines: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
