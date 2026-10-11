'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { EMPLOYEE_NAV, ROLE_LABELS } from '@/components/layout/app-nav';
import { MOCK_EMPLOYEE_SESSION } from '@/features/auth/data/mock-session';

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      nav={EMPLOYEE_NAV}
      user={{ name: MOCK_EMPLOYEE_SESSION.name, roleLabel: ROLE_LABELS.TICKET_SELLER }}
    >
      {children}
    </AppShell>
  );
}
