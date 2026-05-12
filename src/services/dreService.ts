import { transactionService, TransactionFilters } from './transactionService';
import { DreReport, DreReportLine } from '../types/finance_v2';
import { getSupabaseClient } from '../lib/supabase';

export const dreService = {
  async generateReport(filters: TransactionFilters): Promise<DreReport> {
    const supabase = getSupabaseClient();
    
    // Fetch all categories to know their dre_group mapping
    const { data: categories } = await supabase?.from('financial_categories').select('id, dre_group') || { data: [] };
    const categoryDreMap = new Map<string, string>();
    categories?.forEach(c => categoryDreMap.set(c.id, c.dre_group));

    // Fetch PAID transactions in period
    const allTransactions = await transactionService.getAll({ 
      status: 'PAID',
      paymentDateStart: filters.startDate,
      paymentDateEnd: filters.endDate,
      type: filters.type,
      categoryId: filters.categoryId
    });

    // Filtro rigoroso para manter consistência com o Dashboard
    const transactions = allTransactions.filter(t => {
      if (t.cost_center && t.cost_center !== 'cursos') return false;
      const desc = (t.description || '').toUpperCase();
      if (desc.includes('APLICAÇÃO')) return false;
      return true;
    });
    
    // Fetch Lead Revenue from lead_class_enrollments filtered by actual payment dates
    let valorDreQuery = supabase
      .from('lead_class_enrollments')
      .select('valor_recebido')
      .neq('status', 'CANCELLED')
      .gt('valor_recebido', 0);
    let taxaDreQuery = supabase
      .from('lead_class_enrollments')
      .select('taxa_matricula_recebido')
      .neq('status', 'CANCELLED')
      .gt('taxa_matricula_recebido', 0);

    if (filters.startDate) {
      valorDreQuery = valorDreQuery.gte('valor_recebido_paid_at', filters.startDate + 'T00:00:00');
      taxaDreQuery = taxaDreQuery.gte('taxa_matricula_paid_at', filters.startDate + 'T00:00:00');
    }
    if (filters.endDate) {
      valorDreQuery = valorDreQuery.lte('valor_recebido_paid_at', filters.endDate + 'T23:59:59');
      taxaDreQuery = taxaDreQuery.lte('taxa_matricula_paid_at', filters.endDate + 'T23:59:59');
    }

    // Filtro explícito de cursos
    valorDreQuery = (valorDreQuery as any).eq('cost_center', 'cursos');
    taxaDreQuery = (taxaDreQuery as any).eq('cost_center', 'cursos');

    const [{ data: valorEnrollments }, { data: taxaEnrollments }] = await Promise.all([valorDreQuery, taxaDreQuery]);

    let receita_bruta = 0;

    (valorEnrollments || []).forEach((e: any) => { receita_bruta += Number(e.valor_recebido) || 0; });
    (taxaEnrollments || []).forEach((e: any) => { receita_bruta += Number(e.taxa_matricula_recebido) || 0; });
    let deducoes = 0;
    let csp = 0;
    let despesas_op = 0;
    let resultado_fin = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      const group = categoryDreMap.get(t.category_id) || '';

      switch (group) {
        case 'RECEITA_BRUTA': receita_bruta += amt; break;
        case 'DEDUCOES': deducoes += amt; break;
        case 'CSP': csp += amt; break;
        case 'DESPESAS_OP': despesas_op += amt; break;
        case 'RESULTADO_FIN': 
          // Resultado financeiro can have INCOME (yields) or EXPENSE (fees)
          if (t.type === 'INCOME') resultado_fin += amt;
          else resultado_fin -= amt;
          break;
        default:
          // Unmapped fallback logic
          if (t.type === 'INCOME') receita_bruta += amt;
          if (t.type === 'EXPENSE') despesas_op += amt;
          break;
      }
    });

    const receita_liquida = receita_bruta - deducoes;
    const lucro_bruto = receita_liquida - csp;
    const ebitda = lucro_bruto - despesas_op;
    const lucro_liquido = ebitda + resultado_fin;

    const lines: DreReportLine[] = [
      { id: '1', label: '1. Receita Bruta Operacional', value: receita_bruta, isTotal: true },
      { id: '2', label: '2. Deduções da Receita Bruta', value: -deducoes, isTotal: false },
      { id: '3', label: '3. Receita Líquida Operacional', value: receita_liquida, isTotal: true },
      { id: '4', label: '4. Custo dos Serviços Prestados (CSP)', value: -csp, isTotal: false },
      { id: '5', label: '5. Lucro Bruto', value: lucro_bruto, isTotal: true },
      { id: '6', label: '6. Despesas Operacionais', value: -despesas_op, isTotal: false },
      { id: '7', label: '7. EBITDA', value: ebitda, isTotal: true },
      { id: '8', label: '8. Resultado Financeiro Líquido', value: resultado_fin, isTotal: false },
      { id: '9', label: '9. Lucro Líquido do Exercício', value: lucro_liquido, isTotal: true }
    ];

    return {
      period_start: filters.startDate || '',
      period_end: filters.endDate || '',
      lines,
      margins: {
        bruta: receita_liquida > 0 ? (lucro_bruto / receita_liquida) * 100 : 0,
        ebitda: receita_liquida > 0 ? (ebitda / receita_liquida) * 100 : 0,
        liquida: receita_liquida > 0 ? (lucro_liquido / receita_liquida) * 100 : 0
      }
    };
  }
};
