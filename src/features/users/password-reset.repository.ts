/**
 * Repositorio de Tokens de Recuperación de Contraseña (HU04-BD)
 *
 * Capa de acceso a datos para el flujo de restablecimiento de contraseña.
 * Reutiliza la tabla `verification_tokens` de HU03-BD mediante el campo `type`,
 * que discrimina entre 'email_verification' y 'password_reset'.
 *
 * Principios de seguridad aplicados:
 *  - Tokens de vida corta: 1 hora máximo (vs 24h de verificación de correo).
 *  - Solo el hash SHA-256 se persiste; el token plano NUNCA toca la BD.
 *  - La invalidación de la contraseña vieja y la marcación del token como usado
 *    ocurren dentro de una única transacción atómica para evitar condiciones de carrera.
 *  - La función recibe el hash de la nueva contraseña (bcrypt), nunca el texto plano.
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
// Reutiliza la función de hash definida en HU03 para no duplicar lógica
import { hashVerificationToken } from "./verification.repository";
import type {
  CreatePasswordResetTokenParams,
  CreatePasswordResetTokenResult,
  ResetPasswordResult,
  VerificationTokenWithUser,
} from "./types";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Tipo de token para recuperación de contraseña (discriminador en BD) */
const PASSWORD_RESET_TYPE = "password_reset" as const;

/** Duración por defecto en horas para tokens de recuperación (máximo recomendado: 1h) */
const DEFAULT_EXPIRY_HOURS = 1;

// ---------------------------------------------------------------------------
// Funciones públicas
// ---------------------------------------------------------------------------

/**
 * Crea un token de recuperación de contraseña y lo persiste en la BD (HU04-BD).
 *
 * Antes de crear el nuevo token, invalida todos los tokens de recuperación
 * previos activos del mismo usuario (no usados), garantizando que solo exista
 * un token válido por usuario en todo momento.
 *
 * El token plano generado se devuelve ÚNICAMENTE aquí para que la capa de
 * servicio lo incluya en el correo; tras esta llamada no es recuperable.
 *
 * @param params.userId        UUID del usuario que solicita el restablecimiento
 * @param params.plainToken    Token plano opcional (se genera uno seguro si se omite)
 * @param params.expiresInHours Horas de validez (por defecto: 1 hora)
 * @returns Registro en BD + token plano, o null si el userId es inválido
 */
export async function createPasswordResetToken(
  params: CreatePasswordResetTokenParams
): Promise<CreatePasswordResetTokenResult | null> {
  // Validación de entrada: el userId es indispensable
  if (!params || !params.userId || typeof params.userId !== "string" || !params.userId.trim()) {
    return null;
  }

  try {
    // 1. Generar token plano seguro (32 bytes = 64 caracteres hex)
    const plainToken =
      params.plainToken && params.plainToken.trim()
        ? params.plainToken.trim()
        : crypto.randomBytes(32).toString("hex");

    // 2. Hash SHA-256 del token para persistencia en BD
    const tokenHash = hashVerificationToken(plainToken);

    // 3. Calcular ventana de expiración — máximo recomendado: 1 hora
    const hours =
      params.expiresInHours && params.expiresInHours > 0
        ? params.expiresInHours
        : DEFAULT_EXPIRY_HOURS;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    // 4. Invalidar tokens de recuperación previos activos del mismo usuario
    //    Solo afecta tokens type='password_reset' no usados; los de email_verification
    //    del mismo usuario permanecen intactos.
    await prisma.verification_tokens.updateMany({
      where: {
        user_id: params.userId,
        type: PASSWORD_RESET_TYPE,
        used: false,
      },
      data: {
        used: true,
        used_at: new Date(),
        updated_at: new Date(),
      },
    });

    // 5. Crear el nuevo token de recuperación
    const tokenRecord = await prisma.verification_tokens.create({
      data: {
        user_id: params.userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
        type: PASSWORD_RESET_TYPE,
      },
    });

    return { tokenRecord, plainToken };
  } catch (error) {
    console.error("Error al crear token de recuperación de contraseña:", error);
    return null;
  }
}

/**
 * Consulta un token de recuperación de contraseña en la BD (HU04-BD).
 *
 * Acepta tanto el token plano como el hash directamente.
 * Filtra únicamente tokens del tipo 'password_reset' para evitar confundir
 * tokens de verificación de correo con tokens de recuperación.
 *
 * Si el token no existe o la entrada es inválida, devuelve null de forma
 * controlada sin lanzar excepciones.
 *
 * @param tokenOrHash Token en texto plano o SHA-256 hex del token
 * @returns Registro del token con relación users, o null si no existe
 */
export async function getPasswordResetToken(
  tokenOrHash: string
): Promise<VerificationTokenWithUser | null> {
  if (!tokenOrHash || typeof tokenOrHash !== "string" || !tokenOrHash.trim()) {
    return null;
  }

  const clean = tokenOrHash.trim();
  const computedHash = hashVerificationToken(clean);

  try {
    return await prisma.verification_tokens.findFirst({
      where: {
        // Acepta tanto token plano como hash directamente
        OR: [{ token_hash: computedHash }, { token_hash: clean }],
        // Solo tokens de recuperación de contraseña
        type: PASSWORD_RESET_TYPE,
      },
      include: {
        users: true,
      },
    });
  } catch (error) {
    console.error("Error al consultar token de recuperación de contraseña:", error);
    return null;
  }
}

/**
 * Invalida todos los tokens de recuperación activos de un usuario (HU04-BD).
 *
 * Útil en escenarios como:
 *  - El usuario cancela el flujo de recuperación.
 *  - El usuario solicita un nuevo enlace (los anteriores deben caducar).
 *  - El usuario cambió su contraseña por otro medio.
 *
 * Solo afecta tokens `type='password_reset'` con `used=false`.
 *
 * @param userId UUID del usuario cuyos tokens se invalidarán
 * @returns Cantidad de tokens invalidados (0 si no había activos)
 */
export async function invalidatePasswordResetTokens(userId: string): Promise<number> {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return 0;
  }

  try {
    const result = await prisma.verification_tokens.updateMany({
      where: {
        user_id: userId,
        type: PASSWORD_RESET_TYPE,
        used: false,
      },
      data: {
        used: true,
        used_at: new Date(),
        updated_at: new Date(),
      },
    });

    return result.count;
  } catch (error) {
    console.error("Error al invalidar tokens de recuperación:", error);
    return 0;
  }
}

/**
 * Restablece la contraseña de un usuario mediante un token válido (HU04-BD).
 *
 * Operación ATÓMICA que resuelve el caso límite de concurrencia (criterio de aceptación CA04):
 * Si dos solicitudes simultáneas intentan usar el mismo token, el `updateMany` condicional
 * garantiza que solo UNA transacción obtenga count=1. La segunda encontrará `used=true`
 * y será rechazada con código "ALREADY_USED".
 *
 * Flujo interno de la transacción:
 *  1. Marcar el token como usado (condicional: used=false y no expirado).
 *  2. Si count=0, consultar el registro para dar un motivo preciso.
 *  3. Si count=1, actualizar la contraseña del usuario con el nuevo hash.
 *
 * @param plainToken      Token en texto plano recibido del enlace de correo
 * @param newPasswordHash Hash bcrypt de la nueva contraseña (NUNCA texto plano)
 * @returns ResetPasswordResult con success y código de motivo
 */
export async function resetPassword(
  plainToken: string,
  newPasswordHash: string
): Promise<ResetPasswordResult> {
  // Validar entradas antes de tocar la BD
  if (
    !plainToken ||
    typeof plainToken !== "string" ||
    !plainToken.trim() ||
    !newPasswordHash ||
    typeof newPasswordHash !== "string" ||
    !newPasswordHash.trim()
  ) {
    return { success: false, reason: "INVALID_INPUT" };
  }

  const clean = plainToken.trim();
  const tokenHash = hashVerificationToken(clean);
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      // --- Paso 1: Intento atómico de consumo del token ---
      // La condición 'used=false AND expires_at > now' garantiza que solo
      // UNA transacción concurrente puede obtener count=1.
      const updateResult = await tx.verification_tokens.updateMany({
        where: {
          token_hash: tokenHash,
          type: PASSWORD_RESET_TYPE,
          used: false,
          expires_at: { gt: now },
        },
        data: {
          used: true,
          used_at: now,
          updated_at: now,
        },
      });

      // --- Paso 2: Si count=0, dar motivo preciso ---
      if (updateResult.count === 0) {
        const existing = await tx.verification_tokens.findFirst({
          where: {
            token_hash: tokenHash,
            type: PASSWORD_RESET_TYPE,
          },
        });

        if (!existing) {
          return { success: false, reason: "NOT_FOUND" };
        }
        if (existing.used) {
          return { success: false, reason: "ALREADY_USED" };
        }
        if (existing.expires_at <= now) {
          return { success: false, reason: "EXPIRED" };
        }
        // Caso defensivo: no debería llegar aquí
        return { success: false, reason: "NOT_FOUND" };
      }

      // --- Paso 3: Esta transacción ganó la carrera; obtener userId ---
      const tokenRecord = await tx.verification_tokens.findFirst({
        where: {
          token_hash: tokenHash,
          type: PASSWORD_RESET_TYPE,
        },
      });

      if (!tokenRecord) {
        // Situación inesperada (race condition extrema); rollback implícito
        return { success: false, reason: "NOT_FOUND" };
      }

      // --- Paso 4: Actualizar la contraseña del usuario ---
      // newPasswordHash ya viene procesado con bcrypt por la capa de servicio
      await tx.users.update({
        where: { id: tokenRecord.user_id },
        data: {
          password_hash: newPasswordHash,
          updated_at: now,
        },
      });

      return {
        success: true,
        reason: "SUCCESS",
        userId: tokenRecord.user_id,
      };
    });
  } catch (error) {
    console.error("Error en restablecimiento atómico de contraseña:", error);
    return { success: false, reason: "NOT_FOUND" };
  }
}
