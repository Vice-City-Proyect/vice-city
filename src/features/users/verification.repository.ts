import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type {
  CreateVerificationTokenParams,
  CreateVerificationTokenResult,
  VerificationTokenWithUser,
  ConfirmEmailResult,
} from "./types";

/**
 * Genera el hash criptográfico SHA-256 de un token en texto plano.
 *
 * Los tokens NUNCA se guardan en texto plano en la base de datos para prevenir
 * vulnerabilidades en caso de filtración de datos (OWASP recommendation).
 *
 * @param token Token en texto plano
 * @returns Hash SHA-256 en formato hexadecimal
 */
export function hashVerificationToken(token: string): string {
  if (!token || typeof token !== "string") {
    return "";
  }
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Crea un token de verificación de correo en la base de datos (HU03-BD).
 *
 * Almacena el token en hash SHA-256, define su ventana de expiración (24h por defecto)
 * y lo asocia al usuario. Devuelve tanto el registro en base de datos como el
 * token en texto plano necesario para componer el enlace que se envía al usuario.
 *
 * @param params Parámetros de creación (userId, plainToken opcional, horas de validez)
 * @returns Objeto con el registro en BD y el token en texto plano
 */
export async function createVerificationToken(
  params: CreateVerificationTokenParams
): Promise<CreateVerificationTokenResult | null> {
  if (!params || !params.userId || typeof params.userId !== "string") {
    return null;
  }

  try {
    // Generar un token aleatorio seguro de 32 bytes (64 caracteres hex) si no viene provisto
    const plainToken =
      params.plainToken && params.plainToken.trim()
        ? params.plainToken.trim()
        : crypto.randomBytes(32).toString("hex");

    // Calcular hash SHA-256 para persistencia
    const tokenHash = hashVerificationToken(plainToken);

    // Calcular fecha de expiración (por defecto 24 horas)
    const hours = params.expiresInHours && params.expiresInHours > 0 ? params.expiresInHours : 24;
    const expiresAt =
      params.expiresAt instanceof Date
        ? params.expiresAt
        : new Date(Date.now() + hours * 60 * 60 * 1000);

    // Opcional y recomendado: Invalida tokens previos activos no usados de este usuario
    await prisma.verification_tokens.updateMany({
      where: {
        user_id: params.userId,
        used: false,
      },
      data: {
        used: true,
        used_at: new Date(),
      },
    });

    // Insertar el nuevo token con su hash
    const tokenRecord = await prisma.verification_tokens.create({
      data: {
        user_id: params.userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
      },
    });

    return {
      tokenRecord,
      plainToken,
    };
  } catch (error) {
    console.error("Error al crear token de verificación:", error);
    return null;
  }
}

/**
 * Consulta un token de verificación en la base de datos (HU03-BD).
 *
 * Acepta tanto el token en texto plano como directamente el token_hash.
 * Devuelve el registro con la información del usuario asociado.
 * Si el token no existe, está vacío o es inválido, devuelve null de forma controlada sin lanzar excepciones.
 *
 * @param tokenOrHash Token en texto plano o hash del token
 * @returns Registro del token con relación users o null si no existe
 */
export async function getVerificationToken(
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
        OR: [
          { token_hash: computedHash },
          { token_hash: clean },
        ],
      },
      include: {
        users: true,
      },
    });
  } catch (error) {
    console.error("Error al consultar token de verificación:", error);
    return null;
  }
}

/**
 * Marca un token como usado de forma atómica (HU03-BD).
 *
 * Solo actualiza el registro si `used` es false. Si el token ya fue consumido
 * o no existe, la consulta devuelve false, protegiendo contra condiciones de carrera.
 *
 * @param tokenOrHash Token en texto plano o hash del token
 * @returns true si se marcó exitosamente, false si ya estaba usado o no existe
 */
export async function markTokenAsUsed(tokenOrHash: string): Promise<boolean> {
  if (!tokenOrHash || typeof tokenOrHash !== "string" || !tokenOrHash.trim()) {
    return false;
  }

  const clean = tokenOrHash.trim();
  const computedHash = hashVerificationToken(clean);

  try {
    const result = await prisma.verification_tokens.updateMany({
      where: {
        OR: [
          { token_hash: computedHash },
          { token_hash: clean },
        ],
        used: false,
      },
      data: {
        used: true,
        used_at: new Date(),
        updated_at: new Date(),
      },
    });

    return result.count > 0;
  } catch (error) {
    console.error("Error al marcar token como usado:", error);
    return false;
  }
}

/**
 * Marca al usuario como verificado actualizando su estado en la tabla users (HU03-BD).
 *
 * @param userId Identificador único del usuario (UUID)
 * @returns true si el usuario fue actualizado, false en caso contrario
 */
export async function markUserAsVerified(userId: string): Promise<boolean> {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return false;
  }

  try {
    const updated = await prisma.users.update({
      where: { id: userId },
      data: {
        email_verified: true,
        email_verified_at: new Date(),
      },
    });

    return Boolean(updated);
  } catch (error) {
    console.error("Error al marcar usuario como verificado:", error);
    return false;
  }
}

/**
 * Confirmación atómica y segura de correo mediante token (HU03-BD).
 *
 * Resuelve el caso límite de concurrencia:
 * Si dos confirmaciones simultáneas compiten por el mismo token en el mismo instante,
 * la actualización condicional atómica garantiza que solo UNA transacción obtiene count = 1.
 * La segunda encuentra el token ya marcado como usado (count = 0) y es rechazada limpiamente.
 *
 * @param plainToken Token recibido en el enlace de correo
 * @returns ConfirmEmailResult con el estado de la operación
 */
export async function confirmEmailWithToken(
  plainToken: string
): Promise<ConfirmEmailResult> {
  if (!plainToken || typeof plainToken !== "string" || !plainToken.trim()) {
    return { success: false, reason: "INVALID_INPUT" };
  }

  const clean = plainToken.trim();
  const tokenHash = hashVerificationToken(clean);
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Intentar marcar el token como usado de forma atómica y condicional
      // Solo tendrá éxito si used = false y expires_at > now
      const updateResult = await tx.verification_tokens.updateMany({
        where: {
          token_hash: tokenHash,
          used: false,
          expires_at: { gt: now },
        },
        data: {
          used: true,
          used_at: now,
          updated_at: now,
        },
      });

      // Si count es 0, no se pudo consumir (ya usado, expirado o inexistente)
      if (updateResult.count === 0) {
        // Consultar el registro para dar un motivo preciso sin lanzar errores
        const existing = await tx.verification_tokens.findUnique({
          where: { token_hash: tokenHash },
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
        return { success: false, reason: "NOT_FOUND" };
      }

      // 2. Si count es 1, esta transacción ganó la carrera de concurrencia
      // Obtenemos el registro para saber a qué usuario pertenece
      const tokenRecord = await tx.verification_tokens.findUnique({
        where: { token_hash: tokenHash },
      });

      if (!tokenRecord) {
        return { success: false, reason: "NOT_FOUND" };
      }

      // 3. Marcar al usuario como verificado
      await tx.users.update({
        where: { id: tokenRecord.user_id },
        data: {
          email_verified: true,
          email_verified_at: now,
        },
      });

      return {
        success: true,
        reason: "SUCCESS",
        userId: tokenRecord.user_id,
      };
    });
  } catch (error) {
    console.error("Error en confirmación atómica de correo:", error);
    return { success: false, reason: "NOT_FOUND" };
  }
}

