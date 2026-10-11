'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, QrCode, Receipt, CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { StatusBadge, accessKey } from '@/components/ui/StatusBadge';
import { QuickLinks } from '@/components/common/QuickLinks';
import { MaintenanceNotice } from '@/components/common/MaintenanceNotice';
import { formatDate, toISODate } from '@/lib/format';
import { ROLE_LABELS } from '@/components/layout/app-nav';
import { EmployeeSummary } from '@/features/employees/components/EmployeeSummary';
import { AccessControl } from '@/features/employees/components/AccessControl';
import { MOCK_RESERVATIONS } from '@/features/reservations/data/mock-reservations';

type EmployeeRole = 'TICKET_SELLER' | 'QR_VALIDATOR';

const ROLE_ACCESS: Record<EmployeeRole, { href: string; label: string; icon: typeof QrCode }[]> =
  {
    TICKET_SELLER: [
      { href: '/empleado/pos', label: 'Punto de venta', icon: Receipt },
      { href: '/empleado/reservas', label: 'Gestionar reservas', icon: CalendarDays },
      { href: '/empleado/qr', label: 'Validación QR', icon: QrCode },
    ],
    QR_VALIDATOR: [
      { href: '/empleado/qr', label: 'Validar tiquetes', icon: QrCode },
      { href: '/empleado/reservas', label: 'Gestionar reservas', icon: CalendarDays },
      { href: '/empleado/pos', label: 'Punto de venta', icon: Receipt },
    ],
  };

export default function EmployeeDashboardPage() {
  const [role, setRole] = useState<EmployeeRole>('TICKET_SELLER');

  const today = toISODate(new Date());
  const upcoming = MOCK_RESERVATIONS.filter(
    (reservation) => reservation.date === today && reservation.status !== 'CANCELLED',
  ).sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <>
      <PageHeader
        eyebrow="Operación"
        title="Panel del"
        highlightedTitle="empleado"
        description="Resumen del día, control de acceso y accesos rápidos según tu responsabilidad."
        actions={
          <SegmentedTabs
            ariaLabel="Rol del empleado"
            options={[
              { value: 'TICKET_SELLER', label: ROLE_LABELS.TICKET_SELLER },
              { value: 'QR_VALIDATOR', label: ROLE_LABELS.QR_VALIDATOR },
            ]}
            value={role}
            onChange={setRole}
          />
        }
      />

      <div className="flex flex-col gap-6">
        <MaintenanceNotice />

        <EmployeeSummary />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <AccessControl />
          </div>
          <QuickLinks
            title={
              <>
                Accesos del <span className="text-club-primary">rol</span>
              </>
            }
            description={`Permisos visuales para ${ROLE_LABELS[role].toLowerCase()}.`}
            items={ROLE_ACCESS[role]}
          />
        </div>

        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
                Franjas y reservas de <span className="text-club-primary">hoy</span>
              </h2>
              <p className="text-xs text-text-muted">
                Ordenadas por hora de inicio. El acceso finaliza al cerrar la franja.
              </p>
            </div>

            <Link
              href="/empleado/reservas"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-club-accent transition-colors hover:text-club-primary-hover"
            >
              Ver todas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState title="Sin reservas hoy" description="No hay operación registrada para hoy." />
          ) : (
            <ul className="flex flex-col divide-y divide-text-main/10">
              {upcoming.map((reservation) => (
                <li
                  key={reservation.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-text-muted">
                        {reservation.startTime} – {reservation.endTime}
                      </span>
                      <span className="text-sm font-black uppercase text-club-accent">
                        {reservation.serviceName}
                      </span>
                    </div>
                    <span className="text-xs text-text-muted">
                      {reservation.clientName} · {reservation.resource} ·{' '}
                      {formatDate(reservation.date)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={reservation.status} />
                    <StatusBadge status={accessKey(reservation.accessStatus)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
