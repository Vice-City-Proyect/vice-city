'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CLIENT_NAV, ROLE_LABELS } from '@/components/layout/app-nav';
import { MOCK_CLIENT_SESSION } from '@/features/auth/data/mock-session';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      nav={CLIENT_NAV}
      user={{ name: MOCK_CLIENT_SESSION.name, roleLabel: ROLE_LABELS.CLIENT }}
    >
      {children}
    </AppShell>
  );
}
