'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { getErrorMessage } from '@/lib/api-client';
import type { Service } from '@/types/service';
import { ServiceCard } from '@/features/services/components/ServiceCard';
import { ServiceFormModal } from '@/features/services/components/ServiceFormModal';
import {
  buildServiceMutationPayload,
  mapServiceRecordToUi,
  type BackendCategoryRecord,
} from '@/features/services/api/service-mappers';
import {
  createServiceRecord,
  deleteServiceRecord,
  fetchCategories,
  fetchServices,
  setServiceActive,
  updateServiceRecord,
} from '@/features/services/api/services.api';

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
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<BackendCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Service | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [serviceRecords, categoryRecords] = await Promise.all([
        fetchServices(),
        fetchCategories(),
      ]);
      setCategories(categoryRecords);
      setServices(serviceRecords.map(mapServiceRecordToUi));
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  function retry() {
    setLoading(true);
    void loadData();
  }

  async function handleSave(updated: Service) {
    setSaving(true);
    setError(null);
    try {
      const payload = buildServiceMutationPayload(updated, categories);
      if (updated.id === 'srv-new') {
        await createServiceRecord(payload);
      } else {
        await updateServiceRecord(updated.id, {
          ...payload,
          is_active: updated.status === 'ACTIVE',
        });
      }
      setEditing(null);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(service: Service) {
    setError(null);
    try {
      await setServiceActive(service.id, service.status !== 'ACTIVE');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete(service: Service) {
    setError(null);
    try {
      await deleteServiceRecord(service.id);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
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
            <Button size="sm" onClick={() => setEditing({ ...EMPTY_SERVICE })} disabled={loading}>
              <Plus className="h-4 w-4" />
              Nuevo servicio
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <span className="font-bold">{error}</span>
            <button
              type="button"
              onClick={retry}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-red-400/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-red-500/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reintentar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <Card className="items-center justify-center p-12 text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-club-primary" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-text-muted">
            Cargando servicios...
          </p>
        </Card>
      ) : services.length === 0 ? (
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
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
