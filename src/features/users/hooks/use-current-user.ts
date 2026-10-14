'use client';

import { useEffect, useState } from 'react';

export interface CurrentUser {
  fullName: string;
  role: string | null;
}

/** Evento que dispara el perfil al guardar para refrescar el nombre del encabezado. */
export const PROFILE_UPDATED_EVENT = 'user-profile-updated';

/**
 * Datos del usuario autenticado (nombre y rol) tomados de /api/users/me.
 * Devuelve null mientras carga o si el backend falla: quien lo usa debe mostrar
 * un valor genérico, nunca datos de ejemplo. Se actualiza solo al editar el perfil.
 */
export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await fetch('/api/users/me', { cache: 'no-store' });
        if (!response.ok) return;
        const json = await response.json().catch(() => null);
        const data = json?.data;
        if (active && data?.full_name) {
          setUser({ fullName: data.full_name, role: data.role ?? null });
        }
      } catch {
        // Sin conexión o backend caído: el encabezado conserva su valor genérico.
      }
    }

    void loadUser();

    function handleProfileUpdated(event: Event) {
      const fullName = (event as CustomEvent<{ full_name?: string }>).detail?.full_name;
      if (fullName) {
        setUser((current) => ({ fullName, role: current?.role ?? null }));
      }
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    return () => {
      active = false;
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    };
  }, []);

  return user;
}
