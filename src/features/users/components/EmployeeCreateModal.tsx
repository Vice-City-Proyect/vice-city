'use client';

import { useState, type FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  EMPLOYEE_ROLE_OPTIONS,
  validateEmployeeForm,
  type EmployeeFormErrors,
  type EmployeeFormValues,
} from '@/features/employees/employee-validation';
import type { CreateEmployeePayload } from '../api/users.api';

interface EmployeeCreateModalProps {
  onClose: () => void;
  /** Debe lanzar un error con un mensaje legible si el servidor rechaza el alta. */
  onCreate: (payload: CreateEmployeePayload) => Promise<void>;
}

const EMPTY_FORM: EmployeeFormValues = {
  fullName: '',
  email: '',
  password: '',
  role: 'TICKET_SELLER',
  phone: '',
  documentId: '',
};

export function EmployeeCreateModal({ onClose, onCreate }: EmployeeCreateModalProps) {
  const [form, setForm] = useState<EmployeeFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<EmployeeFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(patch: Partial<EmployeeFormValues>) {
    setForm((current) => ({ ...current, ...patch }));
    setSubmitError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const found = validateEmployeeForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setSubmitError(null);
    try {
      await onCreate({
        email: form.email.trim(),
        full_name: form.fullName.trim(),
        password: form.password,
        role: form.role as CreateEmployeePayload['role'],
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(form.documentId.trim() ? { document_id: form.documentId.trim() } : {}),
      });
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo crear el empleado.');
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={saving ? () => undefined : onClose}
      eyebrow="Gestión de empleados"
      title="Nuevo empleado"
      footer={
        <>
          <Button variant="dark" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" form="employee-create-form" disabled={saving}>
            {saving ? 'Creando...' : 'Crear empleado'}
          </Button>
        </>
      }
    >
      <form
        id="employee-create-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <FormField htmlFor="employee-name" label="Nombre completo" error={errors.fullName}>
          <Input
            id="employee-name"
            value={form.fullName}
            error={Boolean(errors.fullName)}
            onChange={(event) => update({ fullName: event.target.value })}
            autoComplete="off"
          />
        </FormField>

        <FormField htmlFor="employee-email" label="Correo electrónico" error={errors.email}>
          <Input
            id="employee-email"
            type="email"
            value={form.email}
            error={Boolean(errors.email)}
            onChange={(event) => update({ email: event.target.value })}
            autoComplete="off"
          />
        </FormField>

        <FormField
          htmlFor="employee-password"
          label="Contraseña inicial"
          error={errors.password}
        >
          <Input
            id="employee-password"
            type="password"
            value={form.password}
            error={Boolean(errors.password)}
            onChange={(event) => update({ password: event.target.value })}
            autoComplete="new-password"
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField htmlFor="employee-role" label="Rol" error={errors.role}>
            <Select
              id="employee-role"
              value={form.role}
              onChange={(event) => update({ role: event.target.value })}
            >
              {EMPLOYEE_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField htmlFor="employee-phone" label="Teléfono (opcional)" error={errors.phone}>
            <Input
              id="employee-phone"
              value={form.phone}
              error={Boolean(errors.phone)}
              onChange={(event) => update({ phone: event.target.value })}
              autoComplete="off"
            />
          </FormField>
        </div>

        <FormField htmlFor="employee-document" label="Documento de identidad (opcional)">
          <Input
            id="employee-document"
            value={form.documentId}
            onChange={(event) => update({ documentId: event.target.value })}
            autoComplete="off"
          />
        </FormField>

        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-600"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-text-muted">
          El empleado queda activo y con el correo verificado. Comparte la contraseña inicial por
          un canal seguro; solo se puede crear el rol de vendedor de tiquetes o validador QR.
        </p>
      </form>
    </Modal>
  );
}
