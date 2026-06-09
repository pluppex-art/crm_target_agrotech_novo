export interface BANTItem {
  status: 'unknown' | 'partial' | 'confirmed' | 'negative';
  // Exact quote from client — never rewritten
  notes: string;
  score: 0 | 1 | 2;
}

export interface BANTAnalysis {
  budget: BANTItem;
  authority: BANTItem;
  need: BANTItem;
  timeline: BANTItem;
  totalScore: number;
  temperature: 'cold' | 'warm' | 'hot';
}

export interface CommercialData {
  // Values preserved EXACTLY as stated by the Operador — never modified
  valorPrincipal: string | null;
  valorPrincipalStatus: 'aguardando' | 'aceito' | null;
  taxaMatricula: string | null;
  taxaMatriculaStatus: 'aguardando' | 'aceito' | null;
}

export interface CopilotAnalysis {
  bant: BANTAnalysis;
  commercial: CommercialData;
  suggestions: string[];
  objections: string[];
  summary: string;
  urgentAlert?: string;
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const ACEITE_SIGNALS = ['ok', 'tudo bem', 'pode ser', 'fechado', 'concordo', 'aceito', 'vamos fazer', 'combinado', 'beleza', 'claro', 'sim', 'perfeito', 'ótimo'];

export const aiCopilotService = {
  async analyze(
    transcript: string,
    context: { name: string; company?: string; stage?: string; notes?: string },
    previousBant?: BANTAnalysis,
  ): Promise<CopilotAnalysis> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
    if (!apiKey) throw new Error('GROQ API key not configured');

    const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const previousCtx = previousBant
      ? `\nAnálise BANT anterior (atualize apenas se houver nova informação explícita):\n${JSON.stringify(previousBant, null, 2)}`
      : '';

    const prompt = `Você é um assistente de vendas para empresa de agronegócio/educação. Sua função é qualificar leads com FIDELIDADE ABSOLUTA ao que foi dito.
Data: ${today}
Lead: ${context.name}${context.company ? ` (${context.company})` : ''}${context.stage ? ` — Etapa: ${context.stage}` : ''}
${context.notes ? `\nNotas do CRM:\n${context.notes}` : ''}
${previousCtx}

Transcrição (formato: "Operador: fala" e "Cliente: fala"):
"""
${transcript || '(sem transcrição — analise com base nas notas do CRM se disponíveis)'}
"""

═══════════════════════════════════════
REGRAS ABSOLUTAS — NUNCA VIOLE:
═══════════════════════════════════════
1. VALORES MONETÁRIOS: Copie EXATAMENTE como o Operador disse. "R$ 4.497 à vista" → copie "R$ 4.497 à vista". JAMAIS arredonde, reescreva ou reformule.
2. TAXA DE MATRÍCULA: É sempre um valor separado do valor principal. NUNCA some ou misture os dois.
3. AUTORIDADE: Se o Cliente disse que é o decisor (ex: "sou eu quem decide", "a decisão é minha", "sou responsável") → authority.status = "confirmed". NUNCA interprete como "partial" ou "necessita aprovação".
4. BANT notes: Copie AS PALAVRAS EXATAS do Cliente, não parafraseie.
5. INFERÊNCIA PROIBIDA: Se não foi dito explicitamente, não registre. Use status "unknown".
6. ACEITE DO CLIENTE: Sinais de aceite = ok, tudo bem, pode ser, fechado, concordo, aceito, vamos fazer, combinado, beleza, claro, sim, perfeito, ótimo → status = "aceito".
7. Se o Cliente negou interesse, é cético ou disse não → marque como "negative".
═══════════════════════════════════════

Retorne APENAS este JSON sem markdown:
{
  "bant": {
    "budget":    { "status": "unknown|partial|confirmed|negative", "notes": "palavras exatas do cliente ou vazio", "score": 0 },
    "authority": { "status": "unknown|partial|confirmed|negative", "notes": "palavras exatas do cliente ou vazio", "score": 0 },
    "need":      { "status": "unknown|partial|confirmed|negative", "notes": "palavras exatas do cliente ou vazio", "score": 0 },
    "timeline":  { "status": "unknown|partial|confirmed|negative", "notes": "palavras exatas do cliente ou vazio", "score": 0 }
  },
  "totalScore": 0,
  "temperature": "cold|warm|hot",
  "commercial": {
    "valorPrincipal": "valor EXATO como Operador disse, ou null",
    "valorPrincipalStatus": "aguardando|aceito|null",
    "taxaMatricula": "valor EXATO como Operador disse, ou null",
    "taxaMatriculaStatus": "aguardando|aceito|null"
  },
  "suggestions": ["pergunta BANT ainda não respondida 1", "pergunta 2", "pergunta 3"],
  "objections": ["objeção literal detectada na fala do cliente"],
  "summary": "resumo 1-2 frases do momento atual",
  "urgentAlert": null
}

Regras de score: 0=não discutido, 1=mencionado/incerto, 2=confirmado explicitamente
Temperatura: cold=totalScore≤2, warm=3-5, hot≥6 (máx 8)
urgentAlert: preencher APENAS para desengajamento forte ou oportunidade crítica de fechamento`;

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 1100,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Groq error: ${res.status}`);

    const data = await res.json();
    const content = (data?.choices?.[0]?.message?.content ?? '').trim();
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');

    const parsed = JSON.parse(match[0]);

    const commercial: CommercialData = {
      valorPrincipal: parsed.commercial?.valorPrincipal ?? null,
      valorPrincipalStatus: parsed.commercial?.valorPrincipalStatus ?? null,
      taxaMatricula: parsed.commercial?.taxaMatricula ?? null,
      taxaMatriculaStatus: parsed.commercial?.taxaMatriculaStatus ?? null,
    };

    return {
      bant: {
        budget: parsed.bant.budget,
        authority: parsed.bant.authority,
        need: parsed.bant.need,
        timeline: parsed.bant.timeline,
        totalScore: parsed.totalScore ?? 0,
        temperature: parsed.temperature ?? 'cold',
      },
      commercial,
      suggestions: parsed.suggestions ?? [],
      objections: parsed.objections ?? [],
      summary: parsed.summary ?? '',
      urgentAlert: parsed.urgentAlert ?? undefined,
    };
  },

  // Quick client-side aceite detection for instant UI feedback
  detectAceite(text: string): boolean {
    const lower = text.toLowerCase();
    return ACEITE_SIGNALS.some(s => lower.includes(s));
  },
};
