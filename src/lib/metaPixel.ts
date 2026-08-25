/**
 * Meta Pixel — helper de eventos
 * Pixel ID: 1895174071188483 (já inicializado no index.html)
 *
 * Garante que o fbq está disponível antes de disparar, evitando erros em
 * ambiente de dev sem o script carregado.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(...args);
  }
}

/**
 * Dispara o evento "Lead" quando um novo lead é submetido pelo formulário público.
 */
export function trackMetaLead(params?: {
  value?: number;
  currency?: string;
  content_name?: string;
}) {
  fbq('track', 'Lead', {
    currency: params?.currency ?? 'BRL',
    value: params?.value ?? 0,
    content_name: params?.content_name ?? '',
  });
}

/**
 * Dispara o evento "Purchase" quando um lead é movido para a coluna "Ganho".
 */
export function trackMetaPurchase(params?: {
  value?: number;
  currency?: string;
  content_name?: string;
}) {
  fbq('track', 'Purchase', {
    currency: params?.currency ?? 'BRL',
    value: params?.value ?? 0,
    content_name: params?.content_name ?? '',
  });
}
