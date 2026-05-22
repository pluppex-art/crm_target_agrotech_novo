import { getSupabaseClient } from '../lib/supabase';
import { CommissionResult, CommissionRule, SemaphoreStatus, RoleType } from '../types/finance_v2';

function getLeadRecord(leads: any): any {
  return Array.isArray(leads) ? leads[0] : leads;
}
import { transactionService } from './transactionService';
import { financialCalculator } from './financialCalculator';
import { productService } from './productService';
import { compensationProfileService } from './compensationProfileService';
import { profileService } from './profileService';

export const oteService = {
  async getCommissionRule(roleType: string, level: string): Promise<CommissionRule | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('commission_rules')
      .select('*')
      .ilike('role_type', roleType)
      .eq('level', level)
      .eq('active', true)
      .single();

    if (error) {
      console.error('[oteService] Error fetching commission rule:', error);
      return null;
    }
    return data as CommissionRule;
  },

  calculateVariablePercentage(achievementPercent: number): number {
    if (achievementPercent >= 100) return 1.0;
    if (achievementPercent >= 90) return 0.75;
    if (achievementPercent >= 80) return 0.60;
    if (achievementPercent >= 70) return 0.50;
    return 0.0;
  },

  getSemaphoreStatus(achievementPercent: number): SemaphoreStatus {
    if (achievementPercent >= 70) return 'GREEN';
    if (achievementPercent >= 50) return 'YELLOW';
    return 'RED';
  },

  calculateAccelerator(achievementPercent: number, baseAcceleratorR$: number): number {
    if (achievementPercent <= 100) return 0;
    const diff = achievementPercent - 100;
    const steps = Math.floor(diff / 5);
    return steps * baseAcceleratorR$;
  },

  /**
   * Busca o nível OFICIAL do usuário em user_compensation_profiles.
   * Esta é a fonte de verdade para o recálculo de OTE.
   */
  async getOfficialLevel(userId: string, roleType: RoleType): Promise<string | null> {
    const profile = await compensationProfileService.getActiveProfile(userId, roleType);
    if (!profile) {
      console.warn(`[oteService] Usuário ${userId} (${roleType}) não tem perfil de compensação ativo.`);
      return null;
    }
    return profile.level;
  },

  /**
   * Verifica se um usuário possui vendas/matrículas registradas.
   * Usado para impedir exclusão de perfis com histórico.
   */
  async hasUserSales(userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { count: byId } = await (supabase as any)
      .from('lead_class_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('responsavel_usuario_id', userId);

    return (byId || 0) > 0;
  },

  /**
   * CÁLCULO INICIAL DO PERÍODO:
   * Varre todos os user_compensation_profiles ativos e cria/atualiza
   * commission_results para cada um, usando as transações históricas.
   * Use este método quando não existem resultados para o período.
   */
  async calculatePeriodFromProfiles(
    periodMonthDate: string
  ): Promise<{ calculated: number; warnings: string[]; totalScanned: number }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { calculated: 0, warnings: [], totalScanned: 0 };

    // Delega o cálculo para a função PostgreSQL SECURITY DEFINER (roda no servidor, ignora RLS)
    const { data, error } = await supabase
      .rpc('calculate_ote_period', { p_period: periodMonthDate });

    if (error) {
      console.error('[oteService] calculate_ote_period RPC error:', error);
      return { calculated: 0, warnings: [`Erro no cálculo server-side: ${error.message}`], totalScanned: 0 };
    }

    const calculated = (data as any)?.calculated ?? 0;

    // Avisos: verificar perfis CRM sem configuração OTE
    const profiles = await compensationProfileService.getAll();
    const allCrmProfiles = await profileService.getProfiles();
    const warnings: string[] = [];
    const managerKeywords = ['GESTOR', 'GERENTE', 'DIRETOR', 'COORDENADOR', 'MANAGER', 'LIDER', 'LEAD'];

    allCrmProfiles.forEach(p => {
      const isComercial = p.department?.toUpperCase() === 'COMERCIAL';
      if (!isComercial) return;

      const isManagerRole = p.cargos?.name && managerKeywords.some(k => p.cargos!.name.toUpperCase().includes(k));
      const isManagerDept = p.department && managerKeywords.some(k => p.department.toUpperCase().includes(k));

      if (isManagerRole || isManagerDept) {
        const hasOteProfile = profiles.some(op => op.user_id === p.id && op.role_type?.toUpperCase() === 'MANAGER');
        if (!hasOteProfile) {
          warnings.push(`⚠️ A gestora/gestor comercial ${p.full_name || p.name || p.email} está sem Perfil OTE ativo.`);
        }
      } else {
        const hasOteProfile = profiles.some(op => op.user_id === p.id && (op.role_type?.toUpperCase() === 'CLOSER' || op.role_type?.toUpperCase() === 'SDR'));
        if (!hasOteProfile) {
          warnings.push(`⚠️ O vendedor/comercial ${p.full_name || p.name || p.email} está sem Perfil OTE ativo.`);
        }
      }
    });

    return { calculated, warnings, totalScanned: calculated };
  },


  async calculateAndUpsertSellerCommission(
    userId: string,
    periodMonthDate: string,
    level: string  // deve vir da fonte oficial — NÃO deve ser hardcoded pelo caller
  ): Promise<CommissionResult | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    let squadId: string | null = null;

    const rule = await this.getCommissionRule('CLOSER', level);
    if (!rule) {
      console.warn(`[oteService] Nenhuma regra CLOSER ativa para nível "${level}". Recálculo bloqueado para o usuário ${userId}.`);
      return null;
    }

    const startDate = periodMonthDate;
    const dateObj = new Date(periodMonthDate);
    const endDate = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).toISOString().split('T')[0];

    // Busca todas as transações de ENTRADA PAGAS no período (Manuais)
    const txs = await transactionService.getAll({
      paymentDateStart: startDate,
      paymentDateEnd: endDate,
      type: 'INCOME',
      status: 'PAID'
    });
    
    // Filtra transações onde o lead associado é de responsabilidade do vendedor
    const sellerManualTxs = txs.filter((t: any) => {
      const leads = getLeadRecord(t.leads);
      return t.user_id === userId || leads?.responsavel_usuario_id === userId;
    });

    // Busca matrículas do período usando lce.responsible diretamente
    const { data: enrollments } = await (supabase
      .from('lead_class_enrollments') as any)
      .select('valor_recebido, taxa_matricula_recebido, responsible, responsavel_usuario_id, cost_center')
      .neq('status', 'CANCELLED')
      .gte('enrolled_at', startDate + 'T00:00:00')
      .lte('enrolled_at', endDate + 'T23:59:59');

    const sellerEnrollments = (enrollments || []).filter((e: any) => {
      return e.responsavel_usuario_id === userId;
    });

    const manualRevenue = sellerManualTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const enrollmentRevenue = sellerEnrollments.reduce((sum, e) => 
      sum + (Number(e.valor_recebido) || 0) + (Number(e.taxa_matricula_recebido) || 0), 0
    );

    const realizedRevenue = manualRevenue + enrollmentRevenue;

    // Busca a meta (target_revenue) na tabela 'goals' para o vendedor - busca a mais recente até o fim do período
    const { data: goalData } = await supabase
      .from('goals')
      .select('revenue_goal')
      .eq('seller_id', userId)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetRevenue = goalData ? Number(goalData.revenue_goal) : Number(rule.target_revenue);
    const achievementPercent = targetRevenue > 0 ? (realizedRevenue / targetRevenue) * 100 : 0;
    const semaphoreStatus = this.getSemaphoreStatus(achievementPercent);
    const variableMultiplier = this.calculateVariablePercentage(achievementPercent);
    const fixedAmount = Number(rule.fixed_amount);
    const variableAmount = Number(rule.variable_amount) * variableMultiplier;
    const acceleratorAmount = this.calculateAccelerator(achievementPercent, Number(rule.accelerator_amount));
    const totalAmount = fixedAmount + variableAmount + acceleratorAmount;

    // Se não encontrou squad no perfil, tenta na tabela squad_members (fallback)
    if (!squadId) {
      const { data: squadMemberData } = await supabase
        .from('squad_members')
        .select('squad_id')
        .eq('user_id', userId)
        .eq('active', true)
        .maybeSingle();
      
      if (squadMemberData) {
        squadId = squadMemberData.squad_id;
      }
    }

    const upsertData = {
      user_id: userId,
      squad_id: squadId || null,
      role_type: 'CLOSER',
      level,                          // snapshot auditável do nível usado neste cálculo
      period_month: periodMonthDate,
      target_revenue: targetRevenue,
      realized_revenue: realizedRevenue,
      achievement_percent: achievementPercent,
      fixed_amount: fixedAmount,
      variable_amount: variableAmount,
      accelerator_amount: acceleratorAmount,
      total_amount: totalAmount,
      semaphore_status: semaphoreStatus,
      status: 'TO_PAY',
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabase
      .from('commission_results')
      .select('id')
      .eq('user_id', userId)
      .eq('period_month', periodMonthDate)
      .eq('role_type', 'CLOSER')
      .select()
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('commission_results')
        .update(upsertData)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) console.error('[oteService] Update CLOSER error:', error);
      result = data;
    } else {
      const { data, error } = await supabase
        .from('commission_results')
        .insert([upsertData])
        .select()
        .single();
      if (error) console.error('[oteService] Insert CLOSER error:', error);
      result = data;
    }

    return result as CommissionResult;
  },

  async calculateAndUpsertManagerCommission(
    userId: string,
    squadId: string,
    periodMonthDate: string,
    level: string  // deve vir da fonte oficial — NÃO deve ser hardcoded pelo caller
  ): Promise<CommissionResult | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const startDate = periodMonthDate;
    const dateObj = new Date(periodMonthDate);
    const endDate = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).toISOString().split('T')[0];

    // A meta dos gestores é a meta da EMPRESA - busca a mais recente globalmente
    const { data: companyGoalData } = await supabase
      .from('goals')
      .select('revenue_goal')
      .eq('type', 'company')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetRevenue = companyGoalData ? Number(companyGoalData.revenue_goal) : 0;
    
    // Busca todas as transações de ENTRADA PAGAS no período (Manuais)
    const txs = await transactionService.getAll({
      paymentDateStart: startDate,
      paymentDateEnd: endDate,
      type: 'INCOME',
      status: 'PAID'
    });
    
    // Busca matrículas do período filtrando apenas CURSOS
    const { data: enrollments } = await (supabase
      .from('lead_class_enrollments') as any)
      .select('valor_recebido, taxa_matricula_recebido, responsible, responsavel_usuario_id, cost_center')
      .neq('status', 'CANCELLED')
      .gte('enrolled_at', startDate + 'T00:00:00')
      .lte('enrolled_at', endDate + 'T23:59:59');

    // Busca membros ativos do squad via squad_members
    const { data: squadMembersList } = await supabase
      .from('squad_members')
      .select('user_id')
      .eq('squad_id', squadId)
      .eq('active', true);

    const memberIds = (squadMembersList || []).map((m: any) => m.user_id).filter(Boolean);
    const allMemberIds = Array.from(new Set([...memberIds, userId]));

    const manualRevenue = txs.reduce((sum, t) => {
      const leads = getLeadRecord((t as any).leads);
      const matchesId = (t.user_id && allMemberIds.includes(t.user_id)) ||
        (leads?.responsavel_usuario_id && allMemberIds.includes(leads.responsavel_usuario_id));
      return matchesId ? sum + (Number(t.amount) || 0) : sum;
    }, 0);

    const enrollmentRevenue = (enrollments || []).reduce((sum: number, e: any) => {
      if (e.responsavel_usuario_id && allMemberIds.includes(e.responsavel_usuario_id)) {
        return sum + (Number(e.valor_recebido) || 0) + (Number(e.taxa_matricula_recebido) || 0);
      }
      return sum;
    }, 0);

    const realizedRevenue = manualRevenue + enrollmentRevenue;

    const rule = await this.getCommissionRule('MANAGER', level);

    const achievementPercent = targetRevenue > 0 ? (realizedRevenue / targetRevenue) * 100 : 0;
    const semaphoreStatus = this.getSemaphoreStatus(achievementPercent);
    const variableMultiplier = this.calculateVariablePercentage(achievementPercent);
    const fixedAmount = rule ? Number(rule.fixed_amount) : 0;
    const variableAmount = rule ? Number(rule.variable_amount) * variableMultiplier : 0;
    const acceleratorAmount = rule ? this.calculateAccelerator(achievementPercent, Number(rule.accelerator_amount)) : 0;
    const totalAmount = fixedAmount + variableAmount + acceleratorAmount;

    const upsertData = {
      user_id: userId,
      squad_id: squadId,
      role_type: 'MANAGER',
      level,                          // snapshot auditável do nível usado neste cálculo
      period_month: periodMonthDate,
      target_revenue: targetRevenue,
      realized_revenue: realizedRevenue,
      achievement_percent: achievementPercent,
      fixed_amount: fixedAmount,
      variable_amount: variableAmount,
      accelerator_amount: acceleratorAmount,
      total_amount: totalAmount,
      semaphore_status: semaphoreStatus,
      status: 'TO_PAY',
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabase
      .from('commission_results')
      .select('id')
      .eq('user_id', userId)
      .eq('period_month', periodMonthDate)
      .eq('role_type', 'MANAGER')
      .eq('squad_id', squadId)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('commission_results')
        .update(upsertData)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) console.error('[oteService] Update MANAGER error:', error);
      result = data;
    } else {
      const { data, error } = await supabase
        .from('commission_results')
        .insert([upsertData])
        .select()
        .single();
      if (error) console.error('[oteService] Insert MANAGER error:', error);
      result = data;
    }

    return result as CommissionResult;
  },

  async getCommissionResults(periodMonthDate: string): Promise<(CommissionResult & { user_name?: string })[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('commission_results')
      .select('*')
      .eq('period_month', periodMonthDate)
      .order('total_amount', { ascending: false });

    if (error) {
      console.error('[oteService] Error fetching commission results:', error);
      return [];
    }
    if (!data || data.length === 0) return [];

    // Busca nomes na tabela perfis diretamente para garantir que todos sejam encontrados
    const { data: allProfiles } = await supabase.from('perfis').select('id, name, email');
    
    // Filtra apenas dados válidos
    const validData = (data as any[]).filter(r => !!r.user_id);
    const userIds = Array.from(new Set(validData.map((r: any) => r.user_id)));
    
    // Busca squads em paralelo - evita 400 Bad Request em listas gigantes de IDs
    const membersRes = await supabase
      .from('squad_members')
      .select('user_id, squad_id, perfis!squad_members_user_id_fkey(name)')
      .eq('active', true);

    const nameMap: Record<string, string> = {};
    const userProfileSquadMap: Record<string, string> = {};
    
    (allProfiles || []).forEach((p: any) => {
      nameMap[p.id] = p.name || p.email || p.id.substring(0, 8);
      if (p.squad_id) {
        userProfileSquadMap[p.id] = p.squad_id;
      }
    });

    // Fallback para squad_members
    (membersRes.data || []).forEach((m: any) => {
      if (!userProfileSquadMap[m.user_id]) {
        userProfileSquadMap[m.user_id] = m.squad_id;
      }
    });

    // Busca nomes de squads (combina IDs da tabela de resultados + IDs vindos dos perfis)
    const resultSquadIds = validData.map((r: any) => r.squad_id).filter(Boolean);
    const profileSquadIds = Object.values(userProfileSquadMap);
    const allSquadIds = Array.from(new Set([...resultSquadIds, ...profileSquadIds]));

    const { data: squadsData } = await supabase
      .from('squads')
      .select('id, name, color')
      .in('id', allSquadIds);

    const squadMap: Record<string, { name: string; color?: string }> = {};
    (squadsData || []).forEach((s: any) => {
      squadMap[s.id] = { name: s.name, color: s.color };
    });

    const processed = validData.map(r => {
      const effectiveSquadId = r.squad_id || userProfileSquadMap[r.user_id];
      const userIdStr = String(r.user_id);
      return {
        ...r,
        user_name: nameMap[userIdStr] || userIdStr.substring(0, 8) || 'N/A',
        squad_name: effectiveSquadId ? squadMap[effectiveSquadId]?.name : undefined,
        squad_color: effectiveSquadId ? squadMap[effectiveSquadId]?.color : undefined
      } as CommissionResult & { user_name?: string };
    });

    // Filtro de deduplicação: Se um usuário tem resultados com e sem squad no mesmo mês/cargo, 
    // removemos o que não tem squad (geralmente lixo ou cálculo incompleto).
    const finalResults: typeof processed = [];
    const grouped = new Map<string, typeof processed>();

    processed.forEach(r => {
      const key = `${r.user_id}_${r.role_type}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    });

    grouped.forEach((items) => {
      if (items.length <= 1) {
        finalResults.push(...items);
        return;
      }

      const hasSquad = items.some(i => !!i.squad_id);
      if (hasSquad) {
        // Se temos resultados com squad, removemos qualquer um que NÃO tenha squad_id
        finalResults.push(...items.filter(i => !!i.squad_id));
      } else {
        // Se nenhum tem squad, mantém o primeiro ou todos (casos raros)
        finalResults.push(items[0]);
      }
    });

    return finalResults.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
  }
};
