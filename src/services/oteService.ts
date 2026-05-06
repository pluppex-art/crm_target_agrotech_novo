import { getSupabaseClient } from '../lib/supabase';
import { CommissionResult, CommissionRule, SemaphoreStatus, RoleType } from '../types/finance_v2';
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
   * CÁLCULO INICIAL DO PERÍODO:
   * Varre todos os user_compensation_profiles ativos e cria/atualiza
   * commission_results para cada um, usando as transações históricas.
   * Use este método quando não existem resultados para o período.
   */
  async calculatePeriodFromProfiles(
    periodMonthDate: string
  ): Promise<{ calculated: number; warnings: string[]; totalScanned: number }> {
    const profiles = await compensationProfileService.getAll();

    // Determina intervalo do período solicitado
    const periodStart = periodMonthDate; // ex: '2026-04-01'
    const periodDateObj = new Date(periodMonthDate);
    const periodEnd = new Date(periodDateObj.getFullYear(), periodDateObj.getMonth() + 1, 0)
      .toISOString().split('T')[0]; // último dia do mês

    // Filtra perfis ativos — permitimos retroatividade se o perfil estiver marcado como ativo
    const activeProfiles = profiles.filter(p => {
      if (!p.active) return false;
      // Para fins de cálculo histórico (ex: Abril), ignoramos a trava de start_date se o usuário quer ver os dados
      const endOk = !p.end_date || p.end_date >= periodStart; 
      return endOk;
    });

    let calculatedCount = 0;
    const warnings: string[] = [];

    // Parallelize calculations for better performance
    const results = await Promise.all(activeProfiles.map(async (profile) => {
      try {
        if (profile.role_type?.toUpperCase() === 'CLOSER' || profile.role_type?.toUpperCase() === 'SDR') {
          const result = await this.calculateAndUpsertSellerCommission(
            profile.user_id, periodMonthDate, profile.level
          );
          if (result) return { success: true };
          return {
            success: false,
            warning: `Não existe uma Regra de Comissão ativa para o cargo CLOSER/SDR no nível "${profile.level}". Cadastre em Configurações → Regras de Comissão.`
          };
        } else if (profile.role_type?.toUpperCase() === 'MANAGER') {
          const supabase = getSupabaseClient();
          if (!supabase) return { success: false };

          const { data: squads } = await supabase
            .from('squads')
            .select('id')
            .eq('manager_id', profile.user_id)
            .eq('active', true);

          if (!squads || squads.length === 0) {
            return {
              success: false,
              warning: `Gestor(a) ${profile.user_name || profile.user_id.substring(0, 8)} não está vinculado(a) a nenhum squad ativo como responsável. Configure em Gestão de Squads.`
            };
          }

          // Calcula para cada squad gerenciado (o upsert cuida de não duplicar se for o mesmo squad)
          let calculatedAny = false;
          for (const s of squads) {
            const result = await this.calculateAndUpsertManagerCommission(
              profile.user_id, s.id, periodMonthDate, profile.level
            );
            if (result) calculatedAny = true;
          }

          if (calculatedAny) return { success: true };

          return {
            success: false,
            warning: `Não existe uma Regra de Comissão ativa para o cargo MANAGER no nível "${profile.level}". Cadastre em Configurações → Regras de Comissão.`
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

    // --- BUSCA PROFUNDA: Identificar perfis no CRM (COMERCIAL) que não têm Perfil OTE ---
    const allCrmProfiles = await profileService.getProfiles();
    const managerKeywords = ['GESTOR', 'GERENTE', 'DIRETOR', 'COORDENADOR', 'MANAGER', 'LIDER', 'LEAD'];

    allCrmProfiles.forEach(p => {
      // Só processa avisos para quem é do departamento COMERCIAL
      const isComercial = p.department?.toUpperCase() === 'COMERCIAL';
      if (!isComercial) return;

      const isManagerRole = p.cargos?.name && managerKeywords.some(k => p.cargos.name.toUpperCase().includes(k));
      const isManagerDept = p.department && managerKeywords.some(k => p.department.toUpperCase().includes(k));

      if (isManagerRole || isManagerDept) {
        const hasOteProfile = profiles.some(op => op.user_id === p.id && op.role_type?.toUpperCase() === 'MANAGER');
        if (!hasOteProfile) {
          warnings.push(`⚠️ A gestora/gestor comercial ${p.full_name || p.name || p.email} está sem Perfil OTE ativo.`);
        }
      } else {
        // Para Closers/SDRs comerciais
        const hasOteProfile = profiles.some(op => op.user_id === p.id && (op.role_type?.toUpperCase() === 'CLOSER' || op.role_type?.toUpperCase() === 'SDR'));
        if (!hasOteProfile) {
          warnings.push(`⚠️ O vendedor/comercial ${p.full_name || p.name || p.email} está sem Perfil OTE ativo.`);
        }
      }
    });

    return { calculated: calculatedCount, warnings, totalScanned: activeProfiles.length };
  },


  async calculateAndUpsertSellerCommission(
    userId: string,
    periodMonthDate: string,
    level: string  // deve vir da fonte oficial — NÃO deve ser hardcoded pelo caller
  ): Promise<CommissionResult | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Busca o nome do usuário para fazer o match com o campo 'responsible' dos leads
    const { data: userData } = await supabase
      .from('perfis')
      .select('name')
      .eq('id', userId)
      .single();
    
    const userName = (userData?.name || '').trim().toLowerCase();

    const rule = await this.getCommissionRule('CLOSER', level);
    if (!rule) {
      console.warn(`[oteService] Nenhuma regra CLOSER ativa para nível "${level}". Recálculo bloqueado para o usuário ${userId}.`);
      return null;
    }

    const startDate = periodMonthDate;
    const dateObj = new Date(periodMonthDate);
    const endDate = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).toISOString().split('T')[0];

    const leads = await transactionService.getGanhoLeads(startDate, endDate);
    
    // Filtra leads onde o usuário é o responsável (Fuzzy Match)
    const sellerLeads = leads.filter((l: any) => {
      const resp = (l.responsible || '').trim().toLowerCase();
      if (!resp || !userName) return false;

      // 1. Match Exato
      if (resp === userName) return true;

      // 2. Match por inclusão
      if (userName.includes(resp) || resp.includes(userName)) return true;

      // 3. Match por palavras (pelo menos 2 palavras significativas coincidindo)
      const respWords = resp.split(/\s+/).filter(w => w.length > 2);
      const userWords = userName.split(/\s+/).filter(w => w.length > 2);
      const commonWords = respWords.filter(rw => userWords.some(uw => uw.includes(rw) || rw.includes(uw)));
      
      return commonWords.length >= 2;
    });

    const products = await productService.getProducts();
    let realizedRevenue = 0;
    sellerLeads.forEach(l => {
      // Usa a MESMA lógica do Pipeline (Pago) através do financialCalculator
      realizedRevenue += financialCalculator.getPaidAmount(l as any, products);
    });

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
    
    const products = await productService.getProducts();
    const allLeads = await transactionService.getGanhoLeads(startDate, endDate);

    // Busca todos os membros do squad para filtrar as vendas
    const { data: squadMembers } = await supabase
      .from('perfis')
      .select('name')
      .eq('squad_id', squadId);
    
    const memberNames = (squadMembers || []).map(m => m.name?.trim().toLowerCase()).filter(Boolean);

    const realizedRevenue = allLeads.reduce((sum, l) => {
      const resp = (l.responsible || '').trim().toLowerCase();
      // Só soma se o responsável pelo lead for um membro do squad do gestor
      if (memberNames.includes(resp)) {
        return sum + financialCalculator.getPaidAmount(l as any, products);
      }
      return sum;
    }, 0);

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

    // Busca nomes de squads
    const squadIds = [...new Set(data.map((r: any) => r.squad_id).filter(Boolean))];
    const { data: squadsData } = await supabase
      .from('squads')
      .select('id, name')
      .in('id', squadIds);

    const squadMap: Record<string, string> = {};
    (squadsData || []).forEach((s: any) => {
      squadMap[s.id] = s.name;
    });

    return (data as CommissionResult[]).map(r => ({
      ...r,
      user_name: nameMap[r.user_id] || r.user_id.substring(0, 8),
      squad_name: r.squad_id ? squadMap[r.squad_id] : undefined
    }));
  }
};
