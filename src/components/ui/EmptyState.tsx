/**
 * Estado vazio (seção 60).
 *
 * Um estado vazio precisa dizer o que está faltando e oferecer a ação que resolve, no
 * mesmo lugar. Lista vazia sem saída é o momento em que o usuário desiste do produto.
 */

import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 text-neutral-300" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium text-neutral-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
