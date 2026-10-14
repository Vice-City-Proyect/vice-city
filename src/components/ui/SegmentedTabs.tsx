'use client';

interface SegmentedTabsProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex w-full flex-wrap rounded-xl border border-text-main/10 bg-club-surface p-1 sm:w-auto ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors duration-200 sm:flex-none sm:px-4 ${
              isActive
                ? 'bg-club-accent text-white'
                : 'text-text-muted hover:bg-club-bg hover:text-text-main'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
