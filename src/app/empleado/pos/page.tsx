'use client';

/**
 * Vista de Empleado: Módulo Punto de Venta (POS) Oficial (/empleado/pos)
 * Vice City - Soporte para FT-06 / HU25 y HU26 (RN-017, RN-019)
 * Conectado a la base de datos real PostgreSQL y endpoints REST.
 */

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PosSaleForm } from '@/features/pos/components/PosSaleForm';

export default function EmployeePosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Punto de venta"
        title="Venta en"
        highlightedTitle="sitio"
        description="Registra reservas y venta directa en taquilla con emisión inmediata de tickets QR (RN-017)."
      />

      <div className="mt-6 flex justify-center">
        <PosSaleForm />
      </div>
    </>
  );
}
