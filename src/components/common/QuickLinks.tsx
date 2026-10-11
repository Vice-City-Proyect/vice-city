import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export interface QuickLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface QuickLinksProps {
  title: React.ReactNode;
  description?: string;
  items: QuickLink[];
}

export function QuickLinks({ title, description, items }: QuickLinksProps) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">{title}</h2>
        {description && <p className="text-xs text-text-muted">{description}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-text-main/10 bg-club-bg/70 px-4 py-4 transition-colors hover:border-club-primary hover:bg-club-surface"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-club-accent text-white">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-text-main">
                  {item.label}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-club-primary-hover" />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
