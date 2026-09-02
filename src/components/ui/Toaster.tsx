/**
 * Superfície dos avisos de feedback.
 *
 * `aria-live="polite"` para que a confirmação chegue a quem usa leitor de tela sem
 * interromper o que está sendo lido. No mobile o aviso sobe acima da barra de navegação,
 * para não cobrir os botões justamente no momento em que o usuário está registrando.
 */

import { useToastStore } from '../../store/useToastStore';
import { cn } from '../../lib/utils';

const TONES = {
  neutral: 'bg-neutral-900 text-white',
  success: 'bg-emerald-700 text-white',
  celebration: 'bg-neutral-900 text-white ring-2 ring-amber-400/60',
} as const;

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:items-end md:px-0"
    >
      {toasts.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => dismiss(item.id)}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-center justify-between gap-4 rounded-xl px-4 py-3 text-left text-sm shadow-lg md:w-auto md:min-w-64',
            TONES[item.tone],
          )}
        >
          <span className="font-medium">{item.message}</span>
          {item.detail && (
            <span className="shrink-0 text-sm font-semibold tabular-nums opacity-90">
              {item.detail}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
