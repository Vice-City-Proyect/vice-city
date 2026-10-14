'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CLIENT_NAV, ROLE_LABELS } from '@/components/layout/app-nav';
import { useCurrentUser } from '@/features/users/hooks/use-current-user';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  // Un ADMIN también puede entrar al portal de cliente: se muestra su rol real.
  const roleLabel = ROLE_LABELS[currentUser?.role as keyof typeof ROLE_LABELS] ?? ROLE_LABELS.CLIENT;

  return (
    <AppShell nav={CLIENT_NAV} user={{ name: currentUser?.fullName ?? 'Cliente', roleLabel }}>
      {children}
    </AppShell>
  );
}
