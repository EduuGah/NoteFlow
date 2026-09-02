/**
 * Feedback de ação (seção 61).
 *
 * "Toda ação importante deve possuir feedback." Concluir uma tarefa mudava a cor do
 * cartão e nada mais — o XP subia num canto da tela que o usuário não estava olhando.
 *
 * A seção 61 também diz para não exagerar na animação, então o aviso é discreto,
 * some sozinho e nunca bloqueia a interface.
 */

import { create } from 'zustand';
import { createId } from '../lib/id';

export type ToastTone = 'neutral' | 'success' | 'celebration';

export interface Toast {
  id: string;
  message: string;
  /** Linha secundária: "+25 XP", "Nível 8". */
  detail?: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  show: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

/** Tempo em tela. Curto o bastante para não atrapalhar, longo para ser lido. */
const DISMISS_AFTER_MS = 3200;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (toast) => {
    const id = createId();
    set((state) => ({
      // Teto de três: uma pilha maior vira ruído e cobre o conteúdo no celular.
      toasts: [...state.toasts, { ...toast, id }].slice(-3),
    }));
    setTimeout(
      () => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      DISMISS_AFTER_MS,
    );
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, detail?: string, tone: ToastTone = 'neutral'): void {
  useToastStore.getState().show({ message, detail, tone });
}
