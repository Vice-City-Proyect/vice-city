'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ADMIN_NAV, ROLE_LABELS } from '@/components/layout/app-nav';
import { useCurrentUser } from '@/features/users/hooks/use-current-user';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();

  return (
    <AppShell
      nav={ADMIN_NAV}
      user={{ name: currentUser?.fullName ?? 'Administrador', roleLabel: ROLE_LABELS.ADMIN }}
    >
      {children}
    </AppShell>
  );
}
