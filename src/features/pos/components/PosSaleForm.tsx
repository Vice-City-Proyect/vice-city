"use client";

/**
 * Componente UI: Formulario de Venta Presencial y Previsualización POS (HU25 & HU26 / RN-017, RN-019)
 * Conectado 100% a datos reales de PostgreSQL y sesión activa de NextAuth (VCP-105).
 */

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { PosSaleResult, PosPaymentMethod, PosPreviewResult } from "../types/pos.types";
import { PosReceiptCard } from "./PosReceiptCard";
import { PosTicketPreviewModal } from "./PosTicketPreviewModal";
import { fetchServices } from "@/features/services/api/services.api";
import type { BackendServiceRecord } from "@/features/services/api/service-mappers";
import { toISODate } from "@/lib/format";

export interface PosSaleFormProps {
  sellerId?: string;
  sellerName?: string;
}

const SLOT_OPTIONS = [
  { value: "08:00", label: "08:00 AM – 09:00 AM" },
  { value: "09:00", label: "09:00 AM – 10:00 AM" },
  { value: "10:00", label: "10:00 AM – 11:00 AM" },
  { value: "11:00", label: "11:00 AM – 12:00 PM" },
  { value: "12:00", label: "12:00 PM – 01:00 PM" },
  { value: "13:00", label: "01:00 PM – 02:00 PM" },
  { value: "14:00", label: "02:00 PM – 03:00 PM" },
  { value: "15:00", label: "03:00 PM – 04:00 PM" },
  { value: "16:00", label: "04:00 PM – 05:00 PM" },
];

export function PosSaleForm({
  sellerId: initialSellerId,
  sellerName: initialSellerName,
}: PosSaleFormProps = {}) {
  // 1. Inyección de sesión activa del empleado vendedor (Tarea 3)
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const [fallbackSeller, setFallbackSeller] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (!session?.user?.id) {
      import("next-auth/react")
        .then(({ getSession }) => getSession())
        .then((s) => {
          if (active && s?.user?.id) {
            setFallbackSeller({
              id: s.user.id,
              name: s.user.name || "Taquillero de Turno",
            });
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [session]);

  const sellerId = initialSellerId || session?.user?.id || fallbackSeller?.id || "";
  const sellerName =
    initialSellerName || session?.user?.name || fallbackSeller?.name || "Taquillero de Turno";

  // 2. Carga dinámica de servicios reales de PostgreSQL (Tarea 2)
  const [services, setServices] = useState<BackendServiceRecord[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Datos del Cliente (Tarea 5)
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Servicio y Franja
  const [serviceId, setServiceId] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);

  // Rango de fechas (Tarea 6)
  const todayStr = toISODate(new Date());
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 15);
  const maxDateStr = toISODate(maxDate);

  const [date, setDate] = useState(() => todayStr);
  const [startTime, setStartTime] = useState("10:00");
  const [quantity, setQuantity] = useState<number | "">(1);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("cash");
  const [notes, setNotes] = useState("");

  // Estado de procesamiento y Previsualización (HU26)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PosPreviewResult | null>(null);
  const [completedSale, setCompletedSale] = useState<PosSaleResult | null>(null);

  // Efecto para cargar los servicios reales de la base de datos
  useEffect(() => {
    let active = true;
    fetchServices()
      .then((records) => {
        if (!active) return;
        const activeRecords = (records || []).filter((s) => s.is_active !== false);
        setServices(activeRecords);
        if (activeRecords.length > 0) {
          setServiceId(activeRecords[0].id);
          setUnitPrice(Number(activeRecords[0].price) || 0);
        }
      })
      .catch((err) => {
        console.error("Error al cargar servicios para POS:", err);
        if (active) {
          setErrorMessage("No se pudieron cargar los servicios de la base de datos.");
        }
      })
      .finally(() => {
        if (active) setLoadingServices(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedService = services.find((s) => s.id === serviceId);
  const currentCapacity = selectedService?.capacity ?? 50;

  const numericQuantity = typeof quantity === "number" && quantity > 0 ? quantity : 0;
  const calculateTotal = () => unitPrice * numericQuantity;

  // Paso 1 (HU26): Previsualizar la venta antes de emitir (Tarea 4, 5 y 6)
  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validaciones de datos del cliente (Tarea 5)
    if (!clientName.trim()) {
      setErrorMessage("Ingresa el nombre completo del cliente.");
      return;
    }
    if (!clientId.trim() || clientId.length < 4) {
      setErrorMessage("La cédula debe ser numérica y contener al menos 4 dígitos.");
      return;
    }

    // Validaciones de cantidad (Tarea 5)
    const parsedQuantity = typeof quantity === "number" ? quantity : parseInt(String(quantity), 10);
    if (Number.isNaN(parsedQuantity) || parsedQuantity < 1) {
      setErrorMessage("La cantidad de cupos debe ser un número entero mayor o igual a 1.");
      return;
    }
    if (selectedService && parsedQuantity > selectedService.capacity) {
      setErrorMessage(
        `La cantidad excede la capacidad máxima del servicio (${selectedService.capacity} personas).`
      );
      return;
    }

    // Validar servicio seleccionado
    if (!serviceId) {
      setErrorMessage("Debes seleccionar un servicio deportivo válido.");
      return;
    }

    // Validar vendedor autenticado (Tarea 3)
    if (!sellerId) {
      setErrorMessage(
        "No se pudo identificar la sesión del empleado vendedor. Inicia sesión nuevamente con un usuario TICKET_SELLER o ADMIN."
      );
      return;
    }

    // Validaciones temporales y reglas de negocio (Tarea 6)
    if (date < todayStr) {
      setErrorMessage("No se pueden crear reservas en fechas pasadas.");
      return;
    }

    if (new Date(`${date}T23:59:59`) > maxDate) {
      setErrorMessage("Las reservas solo se pueden realizar con un máximo de 15 días de anticipación.");
      return;
    }

    const [y, m, d] = date.split("-").map(Number);
    const selectedDateObj = new Date(y, m - 1, d);
    if (selectedDateObj.getDay() === 1) {
      setErrorMessage("El complejo deportivo se encuentra cerrado los lunes por mantenimiento.");
      return;
    }

    const startH = Number(startTime.slice(0, 2));
    const endH = startH + 1;
    if (startH < 8 || endH > 17) {
      setErrorMessage("La reserva debe estar dentro del horario de operación (8:00 AM a 5:00 PM).");
      return;
    }

    if (date === todayStr) {
      const endSlotTime = new Date(`${date}T${String(endH).padStart(2, "0")}:${startTime.slice(3, 5)}:00-05:00`);
      if (new Date() >= endSlotTime) {
        setErrorMessage("La franja horaria seleccionada ya finalizó.");
        return;
      }
    }

    const startAt = `${date}T${startTime}:00-05:00`;
    const endAt = `${date}T${String(endH).padStart(2, "0")}:${startTime.slice(3, 5)}:00-05:00`;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/pos/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId,
          clientName: clientName.trim(),
          clientId: clientId.trim(),
          serviceId,
          startAt,
          endAt,
          quantity: parsedQuantity,
          paymentMethod,
          clientPhone: clientPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Error al previsualizar la venta en taquilla.");
      }

      setPreviewData(data.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado al conectar con el servidor.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Paso 2 (HU26): Confirmar y Emitir Ticket Digital con Idempotencia (Tarea 4)
  const handleConfirmSale = async () => {
    if (!previewData) return;

    setIsConfirming(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: previewData.sellerId,
          clientName: previewData.clientName,
          clientId: previewData.clientId,
          serviceId: previewData.serviceId,
          startAt: previewData.startAt,
          endAt: previewData.endAt,
          quantity: previewData.quantity,
          paymentMethod: previewData.paymentMethod,
          clientPhone: clientPhone.trim() || undefined,
          notes: notes.trim() || undefined,
          previewAvailableCapacity: previewData.availableCapacity,
          idempotencyKey: previewData.previewId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Error al confirmar la venta en taquilla.");
      }

      setCompletedSale(data.data);
      setPreviewData(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado al confirmar la emisión del ticket.";
      setErrorMessage(message);
      setPreviewData(null);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReset = () => {
    setClientName("");
    setClientId("");
    setClientPhone("");
    setQuantity(1);
    setDate(todayStr);
    setStartTime("10:00");
    setNotes("");
    setPreviewData(null);
    setCompletedSale(null);
    setErrorMessage(null);
  };

  if (completedSale) {
    return <PosReceiptCard sale={completedSale} onNewSale={handleReset} />;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl max-w-xl w-full text-white mx-auto">
      {/* Encabezado del POS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-6">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block">
            Módulo POS Empleado
          </span>
          <h2 className="text-xl font-black text-white mt-0.5">Taquilla & Ventas Presenciales</h2>
          <p className="text-xs text-slate-400">Vendedor: {sellerName}</p>
        </div>
        <span className="self-start sm:self-auto bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 rounded-full font-mono font-semibold">
          TICKET_SELLER
        </span>
      </div>

      {/* Alerta de Error */}
      {errorMessage && (
        <div role="alert" className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
          <span className="text-base">❌</span>
          <div>
            <strong className="block font-semibold">Error en taquilla:</strong>
            {errorMessage}
          </div>
        </div>
      )}

      <form onSubmit={handlePreview} className="space-y-4">
        {/* Sección Datos del Cliente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="pos-client-name" className="block text-xs font-medium text-slate-300 mb-1">
              Nombre del Cliente *
            </label>
            <input
              id="pos-client-name"
              type="text"
              required
              placeholder="Nombre completo"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="pos-client-id" className="block text-xs font-medium text-slate-300 mb-1">
              Cédula / Documento *
            </label>
            <input
              id="pos-client-id"
              type="text"
              required
              placeholder="Ej: 1020304050"
              maxLength={12}
              inputMode="numeric"
              value={clientId}
              onChange={(e) => {
                const onlyNumbers = e.target.value.replace(/\D/g, "");
                setClientId(onlyNumbers);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label htmlFor="pos-client-phone" className="block text-xs font-medium text-slate-300 mb-1">
            Teléfono de Contacto (Opcional)
          </label>
          <input
            id="pos-client-phone"
            type="tel"
            placeholder="300 123 4567"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Sección Servicio y Fecha (Tarea 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
          <div>
            <label htmlFor="pos-service" className="block text-xs font-medium text-slate-300 mb-1">
              Servicio Deportivo *
            </label>
            <select
              id="pos-service"
              value={serviceId}
              disabled={loadingServices}
              onChange={(e) => {
                const selected = e.target.value;
                setServiceId(selected);
                const item = services.find((s) => s.id === selected);
                if (item) {
                  setServiceName(item.name);
                  setUnitPrice(Number(item.price) || 0);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
            >
              {loadingServices && services.length === 0 ? (
                <option value="">Cargando servicios disponibles...</option>
              ) : (
                services.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (${Number(item.price).toLocaleString("es-CO")} COP) — Cap. {item.capacity}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="pos-date" className="block text-xs font-medium text-slate-300 mb-1">
              Fecha de Reserva *
            </label>
            <input
              id="pos-date"
              type="date"
              required
              min={todayStr}
              max={maxDateStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Franja Horaria y Cantidad (Tarea 5 y 6) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="pos-slot" className="block text-xs font-medium text-slate-300 mb-1">
              Franja Horaria *
            </label>
            <select
              id="pos-slot"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
            >
              {SLOT_OPTIONS.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pos-quantity" className="block text-xs font-medium text-slate-300 mb-1">
              Cupos / Entradas (Máx. {currentCapacity}) *
            </label>
            <input
              id="pos-quantity"
              type="text"
              inputMode="numeric"
              required
              value={quantity}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val === "") {
                  setQuantity("");
                } else {
                  const num = parseInt(val, 10);
                  setQuantity(Number.isNaN(num) ? "" : num);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center font-mono"
            />
          </div>
        </div>

        {/* Método de Pago Presencial */}
        <div className="pt-2 border-t border-slate-800">
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Método de Pago en Taquilla *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                paymentMethod === "cash"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
              }`}
            >
              <span>💵</span>
              <span>Efectivo</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                paymentMethod === "card"
                  ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/10"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
              }`}
            >
              <span>💳</span>
              <span>Tarjeta (Datáfono)</span>
            </button>
          </div>
        </div>

        {/* Total a Cobrar */}
        <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] text-slate-400 block">Total estimado a cobrar:</span>
            <span className="text-xs text-slate-300">
              {numericQuantity} cupo(s) × ${unitPrice.toLocaleString("es-CO")} COP
            </span>
          </div>
          <span className="text-xl font-black text-emerald-400">
            ${calculateTotal().toLocaleString("es-CO")} COP
          </span>
        </div>

        {/* Botón de Previsualización (HU26) */}
        <button
          type="submit"
          disabled={isSubmitting || loadingServices}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 focus:outline-none transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-2 mt-2 cursor-pointer"
        >
          {isSubmitting ? (
            <span>Calculando y validando previsualización...</span>
          ) : (
            <span>👁️ Previsualizar Ticket Digital (${calculateTotal().toLocaleString("es-CO")})</span>
          )}
        </button>
      </form>

      {/* Modal de Previsualización Oficial (HU26) */}
      {previewData && (
        <PosTicketPreviewModal
          preview={previewData}
          isConfirming={isConfirming}
          onConfirm={handleConfirmSale}
          onCancel={() => setPreviewData(null)}
        />
      )}
    </div>
  );
}
