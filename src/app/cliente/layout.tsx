'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CLIENT_NAV, ROLE_LABELS } from '@/components/layout/app-nav';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [userName, setUserName] = useState<string>('Cliente');

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const json = await response.json();
          if (isMounted && json?.data?.full_name) {
            setUserName(json.data.full_name);
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    loadUser();

    function handleProfileUpdated(event: Event) {
      const customEvent = event as CustomEvent<{ full_name?: string }>;
      if (customEvent.detail?.full_name) {
        setUserName(customEvent.detail.full_name);
      }
    }

    window.addEventListener('user-profile-updated', handleProfileUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('user-profile-updated', handleProfileUpdated);
    };
  }, []);

  return (
    <AppShell
      nav={CLIENT_NAV}
      user={{ name: userName, roleLabel: ROLE_LABELS.CLIENT }}
    >
      {children}
    </AppShell>
  );
}

