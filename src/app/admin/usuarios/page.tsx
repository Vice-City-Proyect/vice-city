'use client';

import { useState } from 'react';
import { Eye, Pencil, Power } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/lib/format';
import type { User } from '@/types/user';
import { MOCK_USERS, ROLE_LABELS } from '@/features/users/data/mock-users';
import { UserDetailModal } from '@/features/users/components/UserDetailModal';
import { UserFormModal } from '@/features/users/components/UserFormModal';

interface UserFilters {
  role: string;
  status: string;
  registeredFrom: string;
}

const EMPTY_USER_FILTERS: UserFilters = { role: '', status: '', registeredFrom: '' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [filters, setFilters] = useState<UserFilters>(EMPTY_USER_FILTERS);
  const [selected, setSelected] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);

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

  function handleToggle(user: User) {
    setUsers((current) =>
      current.map((item) =>
        item.id === user.id
          ? { ...item, status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
          : item,
      ),
    );
  }

  function handleSave(updated: User) {
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setEditing(null);
    setSelected((current) => (current && current.id === updated.id ? updated : current));
  }

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Usuarios y"
        highlightedTitle="empleados"
        description="Consulta y gestiona clientes, administradores y empleados del complejo."
      />

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
            {filtered.length} usuario(s)
          </span>
        </div>

        {filtered.length === 0 ? (
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
                { key: 'phone', header: 'Teléfono', render: (row) => row.phone },
                { key: 'role', header: 'Rol', render: (row) => ROLE_LABELS[row.role] },
                {
                  key: 'status',
                  header: 'Estado',
                  render: (row) => <StatusBadge status={row.status} />,
                },
                {
                  key: 'registered',
                  header: 'Registro',
                  render: (row) => formatDate(row.registeredAt),
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
                    {ROLE_LABELS[row.role]} · {row.phone} · {formatDate(row.registeredAt)}
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

      {editing && (
        <UserFormModal user={editing} onClose={() => setEditing(null)} onSave={handleSave} />
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
