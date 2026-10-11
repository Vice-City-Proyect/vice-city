import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DashboardStats } from '@/features/administration/components/DashboardStats';
import { UpcomingReservations } from '@/features/administration/components/UpcomingReservations';
import { QuickActions } from '@/features/administration/components/QuickActions';
import { OccupancyPanel } from '@/features/administration/components/OccupancyPanel';
import { RevenuePanel } from '@/features/administration/components/RevenuePanel';
import { MaintenanceNotice } from '@/components/common/MaintenanceNotice';

export const metadata: Metadata = {
  title: 'Dashboard | Admin Vice City',
  description: 'Resumen operativo del complejo deportivo Vice City Iguana.',
};

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Panel de control"
        title="Resumen del"
        highlightedTitle="complejo"
        description="Vista general de reservas, ocupación e ingresos de la operación de hoy."
        actions={<Button size="sm">Nueva reserva</Button>}
      />

      <div className="flex flex-col gap-6">
        <MaintenanceNotice />

        <DashboardStats />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <UpcomingReservations />
          </div>
          <QuickActions />
        </div>

        <OccupancyPanel />
        <RevenuePanel />
      </div>
    </>
  );
}
