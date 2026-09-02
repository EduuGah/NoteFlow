/**
 * Motivos de não conclusão (seções 2 e 25).
 *
 * Fonte única de verdade. O `satisfies Record<FailReason, ...>` faz o TypeScript recusar
 * a compilação se um motivo novo for adicionado ao enum sem rótulo correspondente — que
 * foi exatamente o defeito D4: `Insights.tsx` mantinha um mapa paralelo com chaves
 * inventadas (`time`, `energy`, `priority`) e renderizava `lack_of_time` cru no gráfico.
 */

import type { FailReason } from '../types/domain';

export interface FailReasonMeta {
  label: string;
  /** Texto curto usado nos insights, em minúscula, para compor frases. */
  short: string;
  /**
   * Motivos acionáveis pelo usuário aparecem primeiro no seletor. Os demais são
   * circunstanciais — registrá-los é útil para a análise, mas cobrar-se por eles não é.
   */
  actionable: boolean;
}

export const FAIL_REASONS = {
  lack_of_time: { label: 'Falta de tempo', short: 'falta de tempo', actionable: true },
  tiredness: { label: 'Cansaço', short: 'cansaço', actionable: true },
  procrastination: { label: 'Procrastinação', short: 'procrastinação', actionable: true },
  lack_of_motivation: { label: 'Falta de motivação', short: 'falta de motivação', actionable: true },
  forgot: { label: 'Esqueci', short: 'esquecimento', actionable: true },
  priority_changed: { label: 'Prioridade mudou', short: 'mudança de prioridade', actionable: false },
  unexpected_event: { label: 'Imprevisto', short: 'imprevisto', actionable: false },
  external_problem: { label: 'Problema externo', short: 'problema externo', actionable: false },
  no_longer_necessary: { label: 'Não era mais necessário', short: 'deixou de ser necessário', actionable: false },
  other: { label: 'Outro', short: 'outro motivo', actionable: false },
} satisfies Record<FailReason, FailReasonMeta>;

/** Ordem de exibição: acionáveis primeiro, `other` sempre por último. */
export const FAIL_REASON_ORDER: FailReason[] = [
  'lack_of_time',
  'tiredness',
  'procrastination',
  'lack_of_motivation',
  'forgot',
  'priority_changed',
  'unexpected_event',
  'external_problem',
  'no_longer_necessary',
  'other',
];

export function failReasonLabel(reason: FailReason): string {
  return FAIL_REASONS[reason].label;
}
