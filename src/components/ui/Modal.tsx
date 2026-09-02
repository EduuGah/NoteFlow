/**
 * Diálogo modal acessível.
 *
 * Os modais anteriores eram uma `div` com `fixed inset-0` e nada mais: sem `role`, sem
 * fechar no Escape, sem fechar no backdrop, sem trap de foco e sem devolver o foco ao
 * elemento de origem. Para quem navega por teclado, abrir o modal significava continuar
 * tabulando pela página atrás dele; para leitor de tela, não havia diálogo nenhum. A
 * seção 62 pede navegação por teclado, foco visível e suporte a leitor de tela.
 *
 * O trap é implementado à mão de propósito — trazer uma biblioteca de diálogo para isto
 * seria peso desnecessário (seção 42).
 */

import { useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Texto de apoio, associado ao diálogo por `aria-describedby`. */
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`).current;
  const descId = `${titleId}-desc`;

  const focusables = useCallback((): HTMLElement[] => {
    if (!panelRef.current) return [];
    return [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null,
    );
  }, []);

  // Guarda o foco de origem e o devolve ao fechar: quem abriu o modal a partir de um
  // botão precisa voltar para aquele botão, e não para o topo do documento.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const firstField = focusables().find((el) => el.tagName !== 'BUTTON');
    (firstField ?? focusables()[0])?.focus();

    return () => previouslyFocused.current?.focus();
  }, [isOpen, focusables]);

  // Impede a página de fundo de rolar enquanto o diálogo está aberto.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = focusables();
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      // Fecha o ciclo do Tab dentro do diálogo, nos dois sentidos.
      if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, focusables]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        // `mousedown` no backdrop, e não `click`: com `click`, arrastar uma seleção de
        // texto de dentro do diálogo para fora fecharia o modal e perderia o formulário.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-xl',
          size === 'lg' ? 'sm:max-w-lg' : 'sm:max-w-md',
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-neutral-500">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer && (
          <footer className="flex justify-end gap-2 border-t border-neutral-100 bg-neutral-50/60 px-5 py-4 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
