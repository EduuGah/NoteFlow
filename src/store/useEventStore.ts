/**
 * Event log de domínio (seção 46).
 *
 * Append-only: eventos nunca são atualizados nem apagados. Ele existe porque a seção 45
 * exige que histórico não seja sobrescrito — quando uma tarefa muda de 18:00 para 20:00,
 * o estado atual guarda só o 20:00, e a análise de padrões da seção 24 precisa saber que
 * houve a mudança.
 *
 * O log é a fonte de auditoria, não a fonte de leitura: nenhuma tela reconstrói estado a
 * partir dele. Isso mantém o custo baixo agora e deixa a porta aberta para os relatórios
 * avançados sem exigir event sourcing de verdade.
 */

import { create } from 'zustand';
import { createStorePersist } from './persist';
import { createId } from '../lib/id';
import { LOCAL_USER_ID } from '../constants/app';
import type { DomainEvent, DomainEventType } from '../types/domain';

/**
 * Teto de retenção local. `localStorage` gira em torno de 5 MB por origem e um log sem
 * limite acabaria por estourar a cota e derrubar TODAS as escritas, inclusive as das
 * tarefas. Ao migrar para o Postgres o teto deixa de existir.
 */
const MAX_RETAINED_EVENTS = 5000;

interface EventState {
  events: DomainEvent[];
  record: (
    type: DomainEventType,
    entityId: string,
    payload?: Record<string, unknown>,
  ) => void;
  eventsFor: (entityId: string) => DomainEvent[];
  clear: () => void;
}

export const useEventStore = create<EventState>()(
  createStorePersist(
    (set, get) => ({
      events: [],

      record: (type, entityId, payload = {}) =>
        set((state) => {
          const event: DomainEvent = {
            id: createId(),
            user_id: LOCAL_USER_ID,
            type,
            entity_id: entityId,
            payload,
            occurred_at: new Date().toISOString(),
          };
          const events = [...state.events, event];
          return {
            events:
              events.length > MAX_RETAINED_EVENTS
                ? events.slice(events.length - MAX_RETAINED_EVENTS)
                : events,
          };
        }),

      eventsFor: (entityId) => get().events.filter((e) => e.entity_id === entityId),

      clear: () => set({ events: [] }),
    }),
    { name: 'events', version: 1 },
  ),
);

/** Atalho para as stores. Evita repetir `getState()` em cada ação. */
export function recordEvent(
  type: DomainEventType,
  entityId: string,
  payload?: Record<string, unknown>,
): void {
  useEventStore.getState().record(type, entityId, payload);
}
