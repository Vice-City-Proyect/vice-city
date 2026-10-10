import type { ButtonHTMLAttributes, ReactNode } from 'react';

const VARIANTS = {
  primary:
    'group relative overflow-hidden bg-club-primary text-btn-text shadow-sm transition-all duration-300 hover:brightness-110 active:scale-95 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full',
  dark: 
    'group relative overflow-hidden bg-club-accent text-white shadow-sm transition-all duration-300 hover:brightness-110 active:scale-95 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full',
  light:
    'border-2 border-white/50 text-white transition-all duration-300 hover:bg-white hover:text-club-accent active:scale-95',
} as const;

const SIZES = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-5 py-3 text-xs sm:text-sm',
  lg: 'px-7 py-4 text-sm sm:text-base',
} as const;

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-club-primary focus-visible:ring-offset-2';

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  children,
}: ButtonLinkProps) {
  const isExternal = href.startsWith('http');

  return (
    <a
      href={href}
      onClick={onClick}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
}