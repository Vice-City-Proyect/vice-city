import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  highlightedTitle?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  highlightedTitle,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-6 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex max-w-3xl flex-col gap-3">
        {eyebrow && (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-text-main/10 bg-club-surface px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-text-muted">
            <span className="h-2 w-2 rounded-full bg-club-primary" />
            {eyebrow}
          </span>
        )}

        <h1 className="text-2xl font-black uppercase leading-tight tracking-tight text-club-accent sm:text-3xl lg:text-4xl">
          {title}{' '}
          {highlightedTitle && <span className="text-club-primary">{highlightedTitle}</span>}
        </h1>

        {description && (
          <p className="text-sm leading-relaxed text-text-muted sm:text-base">{description}</p>
        )}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
