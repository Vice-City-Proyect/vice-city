import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { ServiceOccupancyMetric } from '@/features/reports/types';

export function OccupancyPanel({ items }: { items: ServiceOccupancyMetric[] }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
          Ocupación <span className="text-club-primary">del día</span>
        </h2>
        <p className="text-xs text-text-muted">Cupos reservados de cada servicio del complejo.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Sin servicios para mostrar"
          description="Cuando haya servicios activos, su ocupación aparecerá aquí."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ProgressBar
              key={item.serviceId}
              label={item.serviceName}
              value={Math.round(item.occupancyRate)}
              detail={`${item.bookedCount} cupos reservados`}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
