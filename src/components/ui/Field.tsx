/**
 * Campos de formulário.
 *
 * O ponto destes componentes é a ligação `label`/`id`: os formulários anteriores tinham
 * `<label>` solto ao lado do `<input>`, sem `htmlFor`, o que deixa o campo sem nome
 * acessível e faz o clique no rótulo não focar o campo. `useId` resolve os dois de uma vez.
 */

import { useId } from 'react';
import { cn } from '../../lib/utils';

const CONTROL =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 ' +
  'placeholder:text-neutral-400 transition-colors ' +
  'focus:border-neutral-900 focus:outline-2 focus:outline-offset-0 focus:outline-neutral-900/10 ' +
  'disabled:bg-neutral-50 disabled:text-neutral-500';

interface FieldShellProps {
  label: string;
  hint?: string;
  /** Rótulo visível apenas para leitor de tela, quando o contexto já explica o campo. */
  hideLabel?: boolean;
  children: (id: string) => React.ReactNode;
  className?: string;
}

function FieldShell({ label, hint, hideLabel, children, className }: FieldShellProps) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(
          'block text-sm font-medium text-neutral-700',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  hint?: string;
  hideLabel?: boolean;
  fieldClassName?: string;
};

export function TextField({
  label,
  hint,
  hideLabel,
  fieldClassName,
  className,
  ...props
}: InputProps) {
  return (
    <FieldShell label={label} hint={hint} hideLabel={hideLabel} className={fieldClassName}>
      {(id) => <input id={id} className={cn(CONTROL, 'h-11 sm:h-10', className)} {...props} />}
    </FieldShell>
  );
}

type TextAreaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string;
  hint?: string;
  fieldClassName?: string;
};

export function TextAreaField({
  label,
  hint,
  fieldClassName,
  className,
  ...props
}: TextAreaProps) {
  return (
    <FieldShell label={label} hint={hint} className={fieldClassName}>
      {(id) => (
        <textarea id={id} className={cn(CONTROL, 'resize-none py-2.5', className)} {...props} />
      )}
    </FieldShell>
  );
}

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string;
  hint?: string;
  fieldClassName?: string;
};

export function SelectField({
  label,
  hint,
  fieldClassName,
  className,
  children,
  ...props
}: SelectProps) {
  return (
    <FieldShell label={label} hint={hint} className={fieldClassName}>
      {(id) => (
        <select id={id} className={cn(CONTROL, 'h-11 sm:h-10', className)} {...props}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}

/**
 * Grupo de opções mutuamente exclusivas renderizado como botões.
 *
 * Usa `role="radiogroup"` com `aria-checked` porque visualmente são botões, mas
 * semanticamente é uma escolha única — sem isso o leitor de tela anuncia dez botões
 * independentes e não informa qual está selecionado.
 */
interface ChoiceGroupProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  columns?: 1 | 2;
}

export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 2,
}: ChoiceGroupProps<T>) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-neutral-700">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-1')}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition-colors sm:min-h-10',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
                selected
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
