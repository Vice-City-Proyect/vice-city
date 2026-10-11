'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ADMIN_NAV, ROLE_LABELS } from '@/components/layout/app-nav';
import { MOCK_ADMIN_SESSION } from '@/features/auth/data/mock-session';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      nav={ADMIN_NAV}
      user={{ name: MOCK_ADMIN_SESSION.name, roleLabel: ROLE_LABELS.ADMIN }}
    >
      {children}
    </AppShell>
  );
}
