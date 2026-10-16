'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { EMPLOYEE_NAV, ROLE_LABELS } from '@/components/layout/app-nav';
import { useCurrentUser } from '@/features/users/hooks/use-current-user';

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  const roleLabel =
    ROLE_LABELS[currentUser?.role as keyof typeof ROLE_LABELS] ?? ROLE_LABELS.TICKET_SELLER;

  return (
    <SessionProvider>
      <AppShell nav={EMPLOYEE_NAV} user={{ name: currentUser?.fullName ?? 'Empleado', roleLabel }}>
        {children}
      </AppShell>
    </SessionProvider>
  );
}
