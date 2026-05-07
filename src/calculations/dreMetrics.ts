/**
 * calculations/dreMetrics.ts
 *
 * Helpers de apresentação do DRE (Demonstração de Resultado do Exercício).
 * A geração do relatório é feita pelo dreService (server-side);
 * este arquivo trata apenas dos cálculos de exibição front-end.
 *
 *  - calcDreMargins → calcula margens (bruta, ebitda, líquida) a partir das linhas
 *  - buildDreSummary → extrai os valores-chave do relatório para os cards
 */

export interface DreLine {
  id: string;
  label: string;
  value: number;
  isTotal: boolean;
}

export interface DreReport {
  lines: DreLine[];
  margins: {
    bruta: number;
    ebitda: number;
    liquida: number;
  };
}

export interface DreSummary {
  receita_bruta: number;      // Linha ID '1'
  resultado_liquido: number;  // Última linha (lucro/prejuízo)
  margem_bruta: number;       // %
  margem_ebitda: number;      // %
  margem_liquida: number;     // %
}

/**
 * Extrai os valores-chave do relatório DRE para exibição nos cards.
 * Retorna zeros se o relatório ainda não foi carregado.
 */
export function buildDreSummary(report: DreReport | null): DreSummary {
  if (!report) {
    return { receita_bruta: 0, resultado_liquido: 0, margem_bruta: 0, margem_ebitda: 0, margem_liquida: 0 };
  }

  const revenueLine    = report.lines.find(l => l.id === '1');
  const netProfitLine  = report.lines[report.lines.length - 1]; // última linha = resultado

  return {
    receita_bruta:     revenueLine?.value    ?? 0,
    resultado_liquido: netProfitLine?.value  ?? 0,
    margem_bruta:      report.margins.bruta,
    margem_ebitda:     report.margins.ebitda,
    margem_liquida:    report.margins.liquida,
  };
}

/**
 * Recalcula margens a partir das linhas, útil para validação.
 * Receita (linha 1) é a base; resultado líquido é a última linha total.
 */
export function calcDreMargins(lines: DreLine[]): { bruta: number; ebitda: number; liquida: number } {
  const receita = lines.find(l => l.id === '1')?.value ?? 0;
  if (receita === 0) return { bruta: 0, ebitda: 0, liquida: 0 };

  // Lucro bruto = receita - CMV (linha id '2' quando existir)
  const cmv         = lines.find(l => l.id === '2')?.value ?? 0;
  const lucroBruto  = receita + cmv; // cmv já é negativo
  const ebitdaLine  = lines.find(l => l.label.toLowerCase().includes('ebitda'))?.value ?? lucroBruto;
  const liquido     = lines[lines.length - 1]?.value ?? 0;

  return {
    bruta:  receita > 0 ? (lucroBruto / receita) * 100 : 0,
    ebitda: receita > 0 ? (ebitdaLine  / receita) * 100 : 0,
    liquida: receita > 0 ? (liquido    / receita) * 100 : 0,
  };
}
