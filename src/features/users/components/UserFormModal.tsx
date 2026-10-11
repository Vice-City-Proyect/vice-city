'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import type { User, UserRole, UserStatus } from '@/types/user';

interface UserFormModalProps {
  user: User;
  onClose: () => void;
  onSave: (user: User) => void;
}

export function UserFormModal({ user, onClose, onSave }: UserFormModalProps) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
  });

  function update(patch: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ ...user, ...form });
  }

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Gestión de usuarios"
      title="Editar usuario"
      footer={
        <>
          <Button variant="dark" size="sm" onClick={onClose}>
            Descartar
          </Button>
          <Button size="sm" type="submit" form="user-form">
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField htmlFor="user-name" label="Nombre completo">
          <Input
            id="user-name"
            value={form.name}
            onChange={(event) => update({ name: event.target.value })}
            required
          />
        </FormField>

        <FormField htmlFor="user-email" label="Correo electrónico">
          <Input
            id="user-email"
            type="email"
            value={form.email}
            onChange={(event) => update({ email: event.target.value })}
            required
          />
        </FormField>

        <FormField htmlFor="user-phone" label="Teléfono">
          <Input
            id="user-phone"
            value={form.phone}
            onChange={(event) => update({ phone: event.target.value })}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField htmlFor="user-role" label="Rol">
            <Select
              id="user-role"
              value={form.role}
              onChange={(event) => update({ role: event.target.value as UserRole })}
            >
              <option value="ADMIN">Administrador</option>
              <option value="CLIENT">Cliente</option>
              <option value="TICKET_SELLER">Vendedor de tiquetes</option>
              <option value="QR_VALIDATOR">Validador QR</option>
            </Select>
          </FormField>

          <FormField htmlFor="user-status" label="Estado">
            <Select
              id="user-status"
              value={form.status}
              onChange={(event) => update({ status: event.target.value as UserStatus })}
            >
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </Select>
          </FormField>
        </div>

        <p className="text-[11px] leading-relaxed text-text-muted">
          Los roles determinan los permisos de acceso: administrador, cliente, vendedor de tiquetes
          y validador QR.
        </p>
      </form>
    </Modal>
  );
}
