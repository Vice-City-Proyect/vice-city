import { Mail, Phone, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/lib/format';
import type { User } from '@/types/user';
import { ROLE_LABELS } from '../data/mock-users';

interface UserDetailModalProps {
  user: User | null;
  onClose: () => void;
}

export function UserDetailModal({ user, onClose }: UserDetailModalProps) {
  if (!user) return null;

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Detalle de usuario"
      title={user.name}
      footer={
        <span className="text-[11px] text-text-muted">
          ID interno: <span className="font-mono">{user.id}</span>
        </span>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size="lg" />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={user.status} />
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-club-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                <ShieldCheck className="h-3 w-3" />
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <span className="text-xs text-text-muted">
              Registrado el {formatDate(user.registeredAt)}
            </span>
          </div>
        </div>

        <dl className="flex flex-col gap-3 rounded-2xl border border-text-main/10 bg-club-bg/60 p-4">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-brand-blue" />
            <span className="font-bold">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 shrink-0 text-brand-blue" />
            <span className="font-bold">{user.phone}</span>
          </div>
        </dl>

        <p className="text-[11px] leading-relaxed text-text-muted">
          La gestión real de usuarios y empleados se conectará al backend en una fase posterior.
        </p>
      </div>
    </Modal>
  );
}
