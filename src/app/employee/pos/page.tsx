"use client";

/**
 * Vista de Empleado: Módulo POS de Taquilla (/employee/pos)
 * Vice City - Soporte para FT-06 / HU25 (RN-017)
 */

import React from "react";
import { PosSaleForm } from "@/features/pos/components/PosSaleForm";

export default function EmployeePosPage() {
  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Cabecera */}
        <div className="mb-8 text-center sm:text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Vice City Sports Complex — Portal Empleados
          </span>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white">
            Punto de Venta Presencial (POS)
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Registro de reservas y venta directa en taquilla con emisión inmediata de tickets QR (RN-017).
          </p>
        </div>

        {/* Formulario POS */}
        <PosSaleForm />
      </div>
    </div>
  );
}

