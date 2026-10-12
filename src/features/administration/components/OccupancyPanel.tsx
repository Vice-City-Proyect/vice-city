import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MOCK_OCCUPANCY, occupancyPercent } from '../data/mock-occupancy';

export function OccupancyPanel() {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
          Ocupación en <span className="text-club-primary">curso</span>
        </h2>
        <p className="text-xs text-text-muted">
          Capacidad física de cada recurso del complejo deportivo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {MOCK_OCCUPANCY.map((item) => (
          <ProgressBar
            key={item.id}
            label={item.name}
            value={occupancyPercent(item)}
            detail={`${item.occupied} de ${item.capacity} personas`}
          />
        ))}
      </div>
    </Card>
  );
}
