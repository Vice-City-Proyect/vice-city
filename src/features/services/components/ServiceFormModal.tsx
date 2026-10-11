'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import type { BookingModality, Service, ServiceCategory, ServiceStatus } from '@/types/service';

interface ServiceFormModalProps {
  service: Service;
  onClose: () => void;
  onSave: (service: Service) => void;
}

const CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: 'POOL', label: 'Piscinas' },
  { value: 'SOCCER_LARGE', label: 'Fútbol grande' },
  { value: 'SOCCER_MICRO', label: 'Microfútbol' },
  { value: 'MULTI_COURT', label: 'Multipropósito' },
  { value: 'GYM', label: 'Gimnasio' },
  { value: 'WET_AREA', label: 'Zona húmeda' },
];

export function ServiceFormModal({ service, onClose, onSave }: ServiceFormModalProps) {
  const [form, setForm] = useState({
    name: service.name,
    category: service.category,
    price: service.price,
    modality: service.modality,
    capacity: service.capacity,
    status: service.status,
    open: service.schedule.open,
    close: service.schedule.close,
    resource: service.resource,
    image: service.image,
  });

  function update(patch: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      ...service,
      name: form.name,
      category: form.category,
      price: Number(form.price),
      modality: form.modality,
      capacity: Number(form.capacity),
      status: form.status,
      resource: form.resource,
      image: form.image,
      schedule: {
        ...service.schedule,
        open: form.open,
        close: form.close,
      },
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Catálogo de servicios"
      title={service.id === 'srv-new' ? 'Nuevo servicio' : 'Editar servicio'}
      footer={
        <>
          <Button variant="dark" size="sm" onClick={onClose}>
            Descartar
          </Button>
          <Button size="sm" type="submit" form="service-form">
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField htmlFor="service-name" label="Nombre">
          <Input
            id="service-name"
            value={form.name}
            onChange={(event) => update({ name: event.target.value })}
            required
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField htmlFor="service-category" label="Categoría">
            <Select
              id="service-category"
              value={form.category}
              onChange={(event) => update({ category: event.target.value as ServiceCategory })}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField htmlFor="service-resource" label="Recurso físico">
            <Input
              id="service-resource"
              value={form.resource}
              onChange={(event) => update({ resource: event.target.value })}
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField htmlFor="service-price" label="Precio (COP)">
            <Input
              id="service-price"
              type="number"
              min={0}
              step={100}
              value={form.price}
              onChange={(event) => update({ price: Number(event.target.value) })}
              required
            />
          </FormField>

          <FormField htmlFor="service-capacity" label="Capacidad">
            <Input
              id="service-capacity"
              type="number"
              min={1}
              value={form.capacity}
              onChange={(event) => update({ capacity: Number(event.target.value) })}
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField htmlFor="service-modality" label="Modalidad de reserva">
            <Select
              id="service-modality"
              value={form.modality}
              onChange={(event) =>
                update({ modality: event.target.value as BookingModality })
              }
            >
              <option value="PER_PERSON_HOUR">Por persona y hora</option>
              <option value="FIXED_HOUR">Por hora fija</option>
            </Select>
          </FormField>

          <FormField htmlFor="service-status" label="Estado">
            <Select
              id="service-status"
              value={form.status}
              onChange={(event) => update({ status: event.target.value as ServiceStatus })}
            >
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField htmlFor="service-open" label="Apertura">
            <Input
              id="service-open"
              type="time"
              value={form.open}
              onChange={(event) => update({ open: event.target.value })}
            />
          </FormField>

          <FormField htmlFor="service-close" label="Cierre">
            <Input
              id="service-close"
              type="time"
              value={form.close}
              onChange={(event) => update({ close: event.target.value })}
            />
          </FormField>
        </div>

        <FormField htmlFor="service-image" label="Imagen (ruta en /public)">
          <Input
            id="service-image"
            value={form.image}
            onChange={(event) => update({ image: event.target.value })}
          />
        </FormField>

        <p className="text-[11px] leading-relaxed text-text-muted">
          Los precios y la capacidad son configurables por el administrador. La reserva conserva el
          precio aplicado al momento de crearse.
        </p>
      </form>
    </Modal>
  );
}
