import { getSupabaseClient } from '../lib/supabase';
import { CommissionResult, CommissionRule, SemaphoreStatus, RoleType } from '../types/finance_v2';
import { transactionService } from './transactionService';
import { compensationProfileService } from './compensationProfileService';

export const oteService = {
  async getCommissionRule(roleType: string, level: string): Promise<CommissionRule | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('commission_rules')
      .select('*')
      .eq('role_type', roleType)
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
   * CÁLCULO INICIAL DO PERÍODO:
   * Varre todos os user_compensation_profiles ativos e cria/atualiza
   * commission_results para cada um, usando as transações históricas.
   * Use este método quando não existem resultados para o período.
   */
  async calculatePeriodFromProfiles(
    periodMonthDate: string
  ): Promise<{ calculated: number; warnings: string[] }> {
    const profiles = await compensationProfileService.getAll();

    // Determina intervalo do período solicitado
    const periodStart = periodMonthDate; // ex: '2026-04-01'
    const periodDateObj = new Date(periodMonthDate);
    const periodEnd = new Date(periodDateObj.getFullYear(), periodDateObj.getMonth() + 1, 0)
      .toISOString().split('T')[0]; // último dia do mês

    // Filtra perfis ativos E com vigência válida para o período
    const activeProfiles = profiles.filter(p => {
      if (!p.active) return false;
      const startOk = !p.start_date || p.start_date <= periodEnd;   // iniciou antes ou durante o período
      const endOk   = !p.end_date   || p.end_date   >= periodStart; // ainda vigente no período
      return startOk && endOk;
    });

    let calculatedCount = 0;
    const warnings: string[] = [];

    // Parallelize calculations for better performance
    const results = await Promise.all(activeProfiles.map(async (profile) => {
      try {
        if (profile.role_type === 'CLOSER' || profile.role_type === 'SDR') {
          const result = await this.calculateAndUpsertSellerCommission(
            profile.user_id, periodMonthDate, profile.level
          );
          if (result) return { success: true };
          return {
            success: false,
            warning: `Sem regra CLOSER ativa para "${profile.level}" (${profile.user_name || profile.user_id.substring(0, 8)}). Configure em Configurações → Regras de Comissão.`
          };
        } else if (profile.role_type === 'MANAGER') {
          const supabase = getSupabaseClient();
          if (!supabase) return { success: false };

          const { data: squadData } = await supabase
            .from('squads')
            .select('id')
            .eq('manager_id', profile.user_id)
            .eq('active', true)
            .limit(1)
            .maybeSingle();

          if (!squadData?.id) {
            return {
              success: false,
              warning: `Gestor ${profile.user_name || profile.user_id.substring(0, 8)} não está vinculado a nenhum squad ativo. Configure em Perfis OTE.`
            };
          }

          const result = await this.calculateAndUpsertManagerCommission(
            profile.user_id, squadData.id, periodMonthDate, profile.level
          );
          if (result) return { success: true };
          return {
            success: false,
            warning: `Sem regra MANAGER ativa para "${profile.level}" (${profile.user_name || profile.user_id.substring(0, 8)}). Configure em Configurações → Regras de Comissão.`
          };
        }
      } catch (err) {
        console.error(`Error calculating for profile ${profile.user_id}:`, err);
        return { success: false, warning: `Erro ao calcular para ${profile.user_name || profile.user_id.substring(0, 8)}.` };
      }
      return { success: false };
    }));

    results.forEach(res => {
      if (res?.success) calculatedCount++;
      if (res?.warning) warnings.push(res.warning);
    });

    return { calculated: calculatedCount, warnings };
  },


  async calculateAndUpsertSellerCommission(
    userId: string,
    periodMonthDate: string,
    level: string  // deve vir da fonte oficial — NÃO deve ser hardcoded pelo caller
  ): Promise<CommissionResult | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const rule = await this.getCommissionRule('CLOSER', level);
    if (!rule) {
      console.warn(`[oteService] Nenhuma regra CLOSER ativa para nível "${level}". Recálculo bloqueado para o usuário ${userId}.`);
      return null;
    }

    const startDate = periodMonthDate;
    const dateObj = new Date(periodMonthDate);
    const endDate = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).toISOString().split('T')[0];

    // Optimized: Filter by date directly in the database query
    const transactions = await transactionService.getAll({ 
      userId, 
      type: 'INCOME', 
      status: 'PAID',
      paymentDateStart: startDate,
      paymentDateEnd: endDate
    });

    let realizedRevenue = 0;
    transactions.forEach(t => {
      if (t.origin_type === 'PIPELINE' || t.origin_type === 'MANUAL') {
        realizedRevenue += Number(t.amount);
      }
    });

    const targetRevenue = Number(rule.target_revenue);
    const achievementPercent = targetRevenue > 0 ? (realizedRevenue / targetRevenue) * 100 : 0;
    const semaphoreStatus = this.getSemaphoreStatus(achievementPercent);
    const variableMultiplier = this.calculateVariablePercentage(achievementPercent);
    const fixedAmount = Number(rule.fixed_amount);
    const variableAmount = Number(rule.variable_amount) * variableMultiplier;
    const acceleratorAmount = this.calculateAccelerator(achievementPercent, Number(rule.accelerator_amount));
    const totalAmount = fixedAmount + variableAmount + acceleratorAmount;

    const upsertData = {
      user_id: userId,
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
      .is('squad_id', null)
      .single();

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

    const rule = await this.getCommissionRule('MANAGER', level);
    if (!rule) {
      console.warn(`[oteService] Nenhuma regra MANAGER ativa para nível "${level}". Recálculo bloqueado para o usuário ${userId}.`);
      return null;
    }

    const { data: members } = await supabase
      .from('squad_members')
      .select('user_id')
      .eq('squad_id', squadId)
      .eq('active', true);

    const memberIds = members?.map(m => m.user_id) || [];

    const startDate = periodMonthDate;
    const dateObj = new Date(periodMonthDate);
    const endDate = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).toISOString().split('T')[0];

    // Optimized: Bulk fetch transactions for all members in the squad with date filters
    const allSquadTxs = await transactionService.getAll({
      type: 'INCOME',
      status: 'PAID',
      paymentDateStart: startDate,
      paymentDateEnd: endDate
    });

    // Filter to only include squad members and valid origins
    const transactions = allSquadTxs.filter(t => 
      t.user_id && memberIds.includes(t.user_id) && 
      (t.origin_type === 'PIPELINE' || t.origin_type === 'MANUAL')
    );

    const realizedRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    const targetRevenue = Number(rule.target_revenue);
    const achievementPercent = targetRevenue > 0 ? (realizedRevenue / targetRevenue) * 100 : 0;
    const semaphoreStatus = this.getSemaphoreStatus(achievementPercent);
    const variableMultiplier = this.calculateVariablePercentage(achievementPercent);
    const fixedAmount = Number(rule.fixed_amount);
    const variableAmount = Number(rule.variable_amount) * variableMultiplier;
    const acceleratorAmount = this.calculateAccelerator(achievementPercent, Number(rule.accelerator_amount));
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
      .single();

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

    // Busca nomes na tabela perfis (FK aponta para auth.users, não perfis — join manual)
    const userIds = [...new Set(data.map((r: any) => r.user_id))];
    const { data: perfisData } = await supabase
      .from('perfis')
      .select('id, name, email')
      .in('id', userIds);

    const nameMap: Record<string, string> = {};
    (perfisData || []).forEach((p: any) => {
      nameMap[p.id] = p.name || p.email || p.id.substring(0, 8);
    });

    return (data as CommissionResult[]).map(r => ({
      ...r,
      user_name: nameMap[r.user_id] || r.user_id.substring(0, 8),
    }));
  }
};
