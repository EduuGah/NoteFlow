/**
 * Perfil e ledger de XP.
 *
 * Duas regras estruturais, ambas vindas do defeito D7:
 *
 * 1. **O ledger é a fonte de verdade.** `xpTotal` não é um contador incrementado; é a soma
 *    das transações. Não existe caminho de código capaz de deixar o total fora de sincronia
 *    com o histórico, porque não existe total armazenado.
 * 2. **Nível e progresso são derivados.** Nada de `level` ou `xpCurrent` gravados. No dia
 *    em que a curva mudar, todo perfil se recalcula sozinho — em vez de ficar preso a um
 *    `xp_current` que foi decrementado com a curva antiga e não tem como ser reconstruído.
 *
 * A chave de idempotência impede crédito duplo: duplo clique em "concluir" gera a mesma
 * chave, e a segunda tentativa é recusada.
 */

import { create } from 'zustand';
import { createStorePersist } from './persist';
import { recordEvent } from './useEventStore';
import { createId } from '../lib/id';
import { today } from '../lib/date';
import { LOCAL_USER_ID } from '../constants/app';
import { levelFromXp, levelProgress } from '../domain/levels';
import type { LevelProgress } from '../domain/levels';
import { xpIdempotencyKey } from '../domain/xp';
import type { IsoDate, XpSourceType, XpTransaction } from '../types/domain';

export interface AwardXpInput {
  amount: number;
  sourceType: XpSourceType;
  sourceId: string;
  /** Distingue ocorrências da mesma origem — o check-in de hoje versus o de ontem. */
  occurrenceKey?: string;
}

export interface AwardXpResult {
  /** Zero quando a transação foi recusada por duplicidade. */
  awarded: number;
  duplicate: boolean;
  previousLevel: number;
  level: number;
  leveledUp: boolean;
}

interface ProfileState {
  username: string | null;
  transactions: XpTransaction[];

  awardXp: (input: AwardXpInput) => AwardXpResult;
  /** Desfaz um crédito quando a ação que o gerou é revertida (reabrir uma tarefa). */
  revokeXp: (sourceType: XpSourceType, sourceId: string, occurrenceKey?: string) => void;
  setUsername: (name: string) => void;
  reset: () => void;
}

function sumXp(transactions: XpTransaction[]): number {
  return transactions.reduce((total, t) => total + t.amount, 0);
}

export const useProfileStore = create<ProfileState>()(
  createStorePersist(
    (set, get) => ({
      username: null,
      transactions: [],

      awardXp: ({ amount, sourceType, sourceId, occurrenceKey }) => {
        const idempotencyKey = xpIdempotencyKey(sourceType, sourceId, occurrenceKey);
        const { transactions } = get();

        const xpBefore = sumXp(transactions);
        const previousLevel = levelFromXp(xpBefore);

        if (transactions.some((t) => t.idempotency_key === idempotencyKey)) {
          return {
            awarded: 0,
            duplicate: true,
            previousLevel,
            level: previousLevel,
            leveledUp: false,
          };
        }

        const transaction: XpTransaction = {
          id: createId(),
          user_id: LOCAL_USER_ID,
          amount,
          source_type: sourceType,
          source_id: sourceId,
          idempotency_key: idempotencyKey,
          earned_at: new Date().toISOString(),
          earned_date: today(),
        };

        set({ transactions: [...transactions, transaction] });

        const level = levelFromXp(xpBefore + amount);
        const leveledUp = level > previousLevel;

        recordEvent('XP_EARNED', sourceId, { amount, sourceType });
        if (leveledUp) recordEvent('LEVEL_UP', LOCAL_USER_ID, { from: previousLevel, to: level });

        return { awarded: amount, duplicate: false, previousLevel, level, leveledUp };
      },

      revokeXp: (sourceType, sourceId, occurrenceKey) => {
        const idempotencyKey = xpIdempotencyKey(sourceType, sourceId, occurrenceKey);
        set((state) => ({
          transactions: state.transactions.filter(
            (t) => t.idempotency_key !== idempotencyKey,
          ),
        }));
      },

      setUsername: (name) => set({ username: name.trim() || null }),

      reset: () => set({ transactions: [], username: null }),
    }),
    { name: 'profile', version: 1 },
  ),
);

// --- Seletores ------------------------------------------------------------
// Derivar em seletor, e não guardar em campo, é o que impede o total de divergir
// do histórico. O custo é uma soma sobre algumas centenas de números por render.

export const selectXpTotal = (state: { transactions: XpTransaction[] }): number =>
  sumXp(state.transactions);

export function useXpTotal(): number {
  return useProfileStore(selectXpTotal);
}

export function useLevelProgress(): LevelProgress {
  return levelProgress(useXpTotal());
}

/** XP conquistado numa data local específica. Alimenta o "+125 XP" da seção 20. */
export function xpEarnedOn(transactions: XpTransaction[], isoDate: IsoDate): number {
  return transactions
    .filter((t) => t.earned_date === isoDate)
    .reduce((total, t) => total + t.amount, 0);
}
