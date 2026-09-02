/**
 * Botão base.
 *
 * Existe para que foco visível, alvo de toque e estado desabilitado sejam decididos uma
 * vez, e não recopiados em cada tela. A seção 62 pede foco visível e alvo clicável
 * adequado; a 49 diz que o uso principal é no celular, onde o alvo mínimo confortável é
 * de 44px — daí a altura dos tamanhos `md` e `lg`.
 */

import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950',
  secondary:
    'bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100',
  ghost: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2 sm:h-10',
  lg: 'h-12 px-5 text-base gap-2',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Botão só de ícone. `label` é obrigatório porque vira `aria-label`: um botão cujo
 * conteúdo é apenas um SVG não tem nome acessível nenhum sem isso.
 */
interface IconButtonProps extends Omit<ButtonProps, 'size' | 'children'> {
  label: string;
  children: React.ReactNode;
}

export function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      className={cn('h-10 w-10 shrink-0 px-0', className)}
      {...props}
    >
      {children}
    </Button>
  );
}
