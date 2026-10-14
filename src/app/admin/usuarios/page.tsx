'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Eye, Pencil, Power, RefreshCw, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { getErrorMessage } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { User } from '@/types/user';
import { ROLE_LABELS } from '@/features/users/data/mock-users';
import {
  isEmployeeRole,
  mapBackendUserToUi,
} from '@/features/users/api/user-mappers';
import {
  changeUserRole,
  createEmployeeRecord,
  fetchAllAdminUsers,
  updateEmployeeRecord,
  type CreateEmployeePayload,
} from '@/features/users/api/users.api';
import { applyUserUpdate } from '@/features/users/api/user-update-plan';
import { UserDetailModal } from '@/features/users/components/UserDetailModal';
import { UserFormModal } from '@/features/users/components/UserFormModal';
import { EmployeeCreateModal } from '@/features/users/components/EmployeeCreateModal';

interface UserFilters {
  role: string;
  status: string;
  registeredFrom: string;
}

const EMPTY_USER_FILTERS: UserFilters = { role: '', status: '', registeredFrom: '' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<UserFilters>(EMPTY_USER_FILTERS);
  const [selected, setSelected] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const records = await fetchAllAdminUsers({ page: 1, limit: 100 });
      setUsers(records.map(mapBackendUserToUi));
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

  const filtered = users.filter((user) => {
    if (filters.role && user.role !== filters.role) return false;
    if (filters.status && user.status !== filters.status) return false;
    if (filters.registeredFrom && user.registeredAt < filters.registeredFrom) return false;
    return true;
  });

  const hasFilters = Object.values(filters).some((value) => value !== '');

  function updateFilters(patch: Partial<UserFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  async function handleToggle(user: User) {
    setError(null);
    if (!isEmployeeRole(user.role)) {
      setError(
        'Solo los empleados (Vendedor de tiquetes / Validador QR) pueden activarse o desactivarse con los endpoints actuales.'
      );
      return;
    }
    try {
      await updateEmployeeRecord(user.id, { is_active: user.status !== 'ACTIVE' });
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleCreateEmployee(payload: CreateEmployeePayload) {
    // Si el servidor rechaza el alta (p. ej. correo duplicado), el error vuelve al modal.
    await createEmployeeRecord(payload);
    setCreating(false);
    setError(null);
    setNotice(`Empleado ${payload.full_name} creado correctamente.`);
    await loadData();
  }

  async function handleSave(updated: User) {
    const original = users.find((item) => item.id === updated.id);
    setSaving(true);
    setError(null);
    try {
      const plan = await applyUserUpdate(updated, original, {
        changeRole: changeUserRole,
        updateEmployee: updateEmployeeRecord,
      });

      setEditing(null);
      await loadData();
      if (plan.notice) {
        setError(plan.notice);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      // La operación pudo aplicarse de forma parcial (p. ej. rol persistido pero
      // edición de datos fallida): recargar refleja el estado real en la interfaz.
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Usuarios y"
        highlightedTitle="empleados"
        description="Consulta y gestiona clientes, administradores y empleados del complejo."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setNotice(null);
              setCreating(true);
            }}
          >
            <span className="inline-flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Nuevo empleado
            </span>
          </Button>
        }
      />

      {notice && (
        <div
          role="status"
          className="mb-5 flex items-center gap-3 rounded-2xl border border-club-primary/40 bg-club-primary/10 px-4 py-3 text-sm font-bold text-club-accent"
        >
          <Check className="h-4 w-4 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-[11px] font-bold uppercase tracking-wider text-text-muted hover:text-club-accent"
          >
            Cerrar
          </button>
        </div>
      )}

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

      <Card className="p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FormField htmlFor="user-role-filter" label="Rol">
            <Select
              id="user-role-filter"
              value={filters.role}
              onChange={(event) => updateFilters({ role: event.target.value })}
            >
              <option value="">Todos los roles</option>
              <option value="ADMIN">Administrador</option>
              <option value="CLIENT">Cliente</option>
              <option value="TICKET_SELLER">Vendedor de tiquetes</option>
              <option value="QR_VALIDATOR">Validador QR</option>
            </Select>
          </FormField>

          <FormField htmlFor="user-status-filter" label="Estado">
            <Select
              id="user-status-filter"
              value={filters.status}
              onChange={(event) => updateFilters({ status: event.target.value })}
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </Select>
          </FormField>

          <FormField htmlFor="user-date-filter" label="Registrado desde">
            <Input
              id="user-date-filter"
              type="date"
              value={filters.registeredFrom}
              onChange={(event) => updateFilters({ registeredFrom: event.target.value })}
            />
          </FormField>

          <div className="flex items-end">
            {hasFilters && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_USER_FILTERS)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-text-main/10 bg-club-surface px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-muted transition-colors hover:border-club-primary hover:text-club-accent"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-text-main/10 pt-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {loading ? 'Cargando usuarios...' : `${filtered.length} usuario(s)`}
          </span>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-3 text-text-muted">
            <RefreshCw className="h-5 w-5 animate-spin text-club-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">Cargando...</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="Sin resultados"
            description="Ajusta los filtros para encontrar un usuario."
          />
        ) : (
          <div className="mt-4">
            <Table
              data={filtered}
              rowKey={(row) => row.id}
              minWidth="56rem"
              columns={[
                {
                  key: 'name',
                  header: 'Nombre',
                  render: (row) => (
                    <div className="flex items-center gap-3">
                      <Avatar name={row.name} size="sm" />
                      <div className="flex flex-col">
                        <span className="font-bold text-club-accent">{row.name}</span>
                        <span className="text-[11px] text-text-muted">{row.email}</span>
                      </div>
                    </div>
                  ),
                },
                { key: 'phone', header: 'Teléfono', render: (row) => row.phone || '—' },
                { key: 'role', header: 'Rol', render: (row) => ROLE_LABELS[row.role] },
                {
                  key: 'status',
                  header: 'Estado',
                  render: (row) => <StatusBadge status={row.status} />,
                },
                {
                  key: 'registered',
                  header: 'Registro',
                  render: (row) => (row.registeredAt ? formatDate(row.registeredAt) : '—'),
                },
                {
                  key: 'actions',
                  header: 'Acciones',
                  className: 'text-right',
                  render: (row) => (
                    <div className="flex items-center justify-end gap-2">
                      <RowAction label="Ver usuario" onClick={() => setSelected(row)}>
                        <Eye className="h-4 w-4" />
                      </RowAction>
                      <RowAction label="Editar" onClick={() => setEditing(row)}>
                        <Pencil className="h-4 w-4" />
                      </RowAction>
                      <RowAction
                        label={row.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                        onClick={() => handleToggle(row)}
                      >
                        <Power className="h-4 w-4" />
                      </RowAction>
                    </div>
                  ),
                },
              ]}
              renderCard={(row) => (
                <div className="flex flex-col gap-3 rounded-2xl border border-text-main/10 bg-club-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={row.name} size="sm" />
                      <div>
                        <p className="text-sm font-black uppercase text-club-accent">{row.name}</p>
                        <p className="text-[11px] text-text-muted">{row.email}</p>
                      </div>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="text-xs text-text-muted">
                    {ROLE_LABELS[row.role]} · {row.phone || '—'} ·{' '}
                    {row.registeredAt ? formatDate(row.registeredAt) : '—'}
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <RowAction label="Ver usuario" onClick={() => setSelected(row)}>
                      <Eye className="h-4 w-4" />
                    </RowAction>
                    <RowAction label="Editar" onClick={() => setEditing(row)}>
                      <Pencil className="h-4 w-4" />
                    </RowAction>
                    <RowAction
                      label={row.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                      onClick={() => handleToggle(row)}
                    >
                      <Power className="h-4 w-4" />
                    </RowAction>
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </Card>

      <UserDetailModal user={selected} onClose={() => setSelected(null)} />

      {creating && (
        <EmployeeCreateModal
          onClose={() => setCreating(false)}
          onCreate={handleCreateEmployee}
        />
      )}

      {editing && (
        <UserFormModal
          user={editing}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}

function RowAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-text-main/10 bg-club-bg/70 text-text-muted transition-colors hover:border-club-primary hover:text-club-accent"
    >
      {children}
    </button>
  );
}
