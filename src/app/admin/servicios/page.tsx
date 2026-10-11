'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Service } from '@/types/service';
import { MOCK_SERVICES } from '@/features/services/data/mock-services';
import { ServiceCard } from '@/features/services/components/ServiceCard';
import { ServiceFormModal } from '@/features/services/components/ServiceFormModal';

const EMPTY_SERVICE: Service = {
  id: 'srv-new',
  name: '',
  category: 'POOL',
  description: 'Nuevo servicio del complejo deportivo.',
  price: 2000,
  priceUnit: 'PERSON_HOUR',
  modality: 'PER_PERSON_HOUR',
  capacity: 10,
  status: 'ACTIVE',
  schedule: { open: '08:00', close: '17:00', closedDays: [1] },
  image: '/piscina-adultos.jpeg',
  resource: '',
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [editing, setEditing] = useState<Service | null>(null);

  function handleSave(updated: Service) {
    setServices((current) => {
      if (updated.id === 'srv-new') {
        return [...current, { ...updated, id: `srv-${Date.now()}` }];
      }
      return current.map((item) => (item.id === updated.id ? updated : item));
    });
    setEditing(null);
  }

  function handleToggle(service: Service) {
    setServices((current) =>
      current.map((item) =>
        item.id === service.id
          ? { ...item, status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
          : item,
      ),
    );
  }

  function handleDelete(service: Service) {
    setServices((current) => current.filter((item) => item.id !== service.id));
  }

  const activeCount = services.filter((service) => service.status === 'ACTIVE').length;

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Servicios del"
        highlightedTitle="complejo"
        description="Administra categorías, precios, capacidad y horarios de cada instalación."
        actions={
          <>
            <span className="rounded-xl border border-text-main/10 bg-club-surface px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              {activeCount} activo(s) · {services.length - activeCount} inactivo(s)
            </span>
            <Button size="sm" onClick={() => setEditing({ ...EMPTY_SERVICE })}>
              <Plus className="h-4 w-4" />
              Nuevo servicio
            </Button>
          </>
        }
      />

      {services.length === 0 ? (
        <EmptyState
          title="Sin servicios"
          description="Crea el primer servicio del complejo para comenzar a operar."
          action={
            <Button size="sm" onClick={() => setEditing({ ...EMPTY_SERVICE })}>
              <Plus className="h-4 w-4" />
              Nuevo servicio
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={setEditing}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {editing && (
        <ServiceFormModal
          service={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
