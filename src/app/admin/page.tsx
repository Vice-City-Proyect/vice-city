import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { AdminDashboard } from '@/features/administration/components/AdminDashboard';
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
        <AdminDashboard />
      </div>
    </>
  );
}
