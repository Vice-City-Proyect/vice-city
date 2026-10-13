/**
 * Esquemas de Validación Zod para el Módulo de Escáner QR (HU13 - VCP-57)
 * Vice City - Feature: QR Scanner
 */

import { z } from "zod";

export const qrCodeParamSchema = z.object({
  code: z
    .string()
    .trim()
    .min(8, "El código QR debe tener al menos 8 caracteres")
    .max(128, "El código QR excede la longitud máxima permitida")
    .regex(/^[a-zA-Z0-9_-]+$/, "El código QR contiene caracteres no válidos"),
});

export const confirmEntrySchema = z.object({
  code: z
    .string()
    .trim()
    .min(8, "El código QR debe tener al menos 8 caracteres")
    .max(128, "El código QR excede la longitud máxima permitida")
    .regex(/^[a-zA-Z0-9_-]+$/, "El código QR contiene caracteres no válidos"),
  accessPoint: z.string().trim().max(50).optional().default("Torniquete Principal"),
});

export type QRCodeParam = z.infer<typeof qrCodeParamSchema>;
export type ConfirmEntryInput = z.infer<typeof confirmEntrySchema>;
