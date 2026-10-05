import type { HTMLAttributes, ReactNode } from 'react';

interface SectionProps extends HTMLAttributes<HTMLElement> {
  id?: string;
  className?: string;
  children: ReactNode;
}

export function Section({ id, className = '', children, ...props }: SectionProps) {
  return (
    <section
      id={id}
      className={`relative scroll-mt-20 overflow-hidden py-16 sm:py-20 lg:py-24 ${className}`}
      {...props}
    >
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  highlightedTitle?: string;
  description?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  highlightedTitle,
  description,
}: SectionHeaderProps) {
  return (
    <div className="mb-10 flex max-w-3xl flex-col sm:mb-14">
      <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-text-main bg-club-surface px-3.5 py-1.5 text-xs font-bold uppercase ">
        <span className="h-2 w-2 rounded-full bg-club-primary" />
        {eyebrow}
      </span>

      <h2 className="text-3xl font-black uppercase leading-tight tracking-tight text-club-accent sm:text-4xl lg:text-5xl">
        {title} {highlightedTitle && <span className="text-club-primary">{highlightedTitle}</span>}
      </h2>

      {description && (
        <p className="mt-4 text-base leading-relaxed text-text-muted sm:text-lg">{description}</p>
      )}
    </div>
  );
}