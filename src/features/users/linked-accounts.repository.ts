/**
 * Repositorio de Cuentas Vinculadas Externas (Google / OAuth) (HU05-BD)
 *
 * Capa de acceso a datos (ORM Prisma) para gestionar la vinculación
 * de identidades externas (ej. Google Sign-In) con los usuarios de Vice City.
 *
 * Principios y restricciones clave:
 * - Unicidad por (provider, provider_account_id): Una cuenta externa
 *   solo puede pertenecer a un único usuario del sistema.
 * - Validación controlada de errores: No propaga excepciones no controladas
 *   al buscar cuentas inexistentes o rechazar vinculaciones duplicadas.
 * - Atomicidad y concurrencia: Dos vinculaciones simultáneas de la misma
 *   cuenta externa garantizan que solo una tiene éxito; la segunda es
 *   rechazada de forma controlada.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  LinkedAccountWithUser,
  LinkAccountParams,
  LinkAccountResult,
} from "./types";

/**
 * Normaliza los identificadores de proveedor para consistencia de almacenamiento.
 */
function normalizeProvider(provider: string): string {
  return provider.trim().toLowerCase();
}

/**
 * Normaliza el ID externo provisto por el servicio de identidad.
 */
function normalizeProviderAccountId(providerAccountId: string): string {
  return providerAccountId.trim();
}

/**
 * Busca una cuenta vinculada externa por su proveedor y su identificador en el proveedor (HU05-BD).
 *
 * Retorna el registro de la cuenta incluyendo los datos completos del usuario vinculado,
 * o `null` si no existe o si los argumentos son inválidos, de forma totalmente controlada.
 *
 * @param provider Nombre del proveedor (ej. 'google')
 * @param providerAccountId Identificador de cuenta en el proveedor (ej. Google ID / sub)
 * @returns Cuenta vinculada con relación users o null
 */
export async function findLinkedAccount(
  provider: string,
  providerAccountId: string
): Promise<LinkedAccountWithUser | null> {
  if (
    !provider ||
    typeof provider !== "string" ||
    !provider.trim() ||
    !providerAccountId ||
    typeof providerAccountId !== "string" ||
    !providerAccountId.trim()
  ) {
    return null;
  }

  const cleanProvider = normalizeProvider(provider);
  const cleanAccountId = normalizeProviderAccountId(providerAccountId);

  try {
    return await prisma.linked_accounts.findUnique({
      where: {
        provider_provider_account_id: {
          provider: cleanProvider,
          provider_account_id: cleanAccountId,
        },
      },
      include: {
        users: true,
      },
    });
  } catch (error) {
    console.error("Error al buscar cuenta vinculada:", error);
    return null;
  }
}

/**
 * Vincula una cuenta externa (ej. Google) a un usuario del sistema (HU05-BD).
 *
 * Reglas de negocio y criterios de aceptación cubiertos:
 * - CA02: Vincula una cuenta nueva exitosamente si está libre.
 * - CA03: Si la cuenta externa ya está vinculada a OTRO usuario, rechaza la operación
 *   con `ALREADY_LINKED_TO_OTHER_USER`.
 * - Si ya está vinculada al MISMO usuario, devuelve éxito idempotente con `ALREADY_LINKED_TO_SAME_USER`.
 * - CA04: Si dos vinculaciones de la misma cuenta externa ocurren en paralelo, la restricción
 *   única de base de datos (`provider, provider_account_id`) garantiza que solo una se guarda;
 *   la otra es interceptada de forma controlada sin lanzar excepciones.
 *
 * @param params Parámetros de vinculación (userId, provider, providerAccountId)
 * @returns LinkAccountResult con éxito booleano, motivo detallado y el registro de la cuenta
 */
export async function linkAccount(
  params: LinkAccountParams
): Promise<LinkAccountResult> {
  if (
    !params ||
    !params.userId ||
    typeof params.userId !== "string" ||
    !params.userId.trim() ||
    !params.provider ||
    typeof params.provider !== "string" ||
    !params.provider.trim() ||
    !params.providerAccountId ||
    typeof params.providerAccountId !== "string" ||
    !params.providerAccountId.trim()
  ) {
    return {
      success: false,
      reason: "INVALID_INPUT",
    };
  }

  const cleanUserId = params.userId.trim();
  const cleanProvider = normalizeProvider(params.provider);
  const cleanAccountId = normalizeProviderAccountId(params.providerAccountId);

  try {
    // 1. Verificar si la cuenta externa ya existe vinculada
    const existing = await prisma.linked_accounts.findUnique({
      where: {
        provider_provider_account_id: {
          provider: cleanProvider,
          provider_account_id: cleanAccountId,
        },
      },
    });

    if (existing) {
      if (existing.user_id === cleanUserId) {
        // Idempotencia: ya vinculada al mismo usuario
        return {
          success: true,
          reason: "ALREADY_LINKED_TO_SAME_USER",
          account: existing,
        };
      }

      // CA03: Ya pertenece a otro usuario -> rechazar
      return {
        success: false,
        reason: "ALREADY_LINKED_TO_OTHER_USER",
      };
    }

    // 2. Intentar crear la vinculación
    const created = await prisma.linked_accounts.create({
      data: {
        user_id: cleanUserId,
        provider: cleanProvider,
        provider_account_id: cleanAccountId,
      },
    });

    return {
      success: true,
      reason: "SUCCESS",
      account: created,
    };
  } catch (error) {
    // Manejo de concurrencia: si otra solicitud insertó exactamente al mismo tiempo
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Re-verificar para dar un motivo preciso sin lanzar error
      const afterConflict = await prisma.linked_accounts.findUnique({
        where: {
          provider_provider_account_id: {
            provider: cleanProvider,
            provider_account_id: cleanAccountId,
          },
        },
      });

      if (afterConflict?.user_id === cleanUserId) {
        return {
          success: true,
          reason: "ALREADY_LINKED_TO_SAME_USER",
          account: afterConflict,
        };
      }

      return {
        success: false,
        reason: "ALREADY_LINKED_TO_OTHER_USER",
      };
    }

    // Violación de foreign key si el usuario no existe
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        reason: "USER_NOT_FOUND",
      };
    }

    console.error("Error al vincular cuenta externa:", error);
    return {
      success: false,
      reason: "INVALID_INPUT",
    };
  }
}

/**
 * Obtiene todas las cuentas externas vinculadas a un usuario específico.
 *
 * @param userId UUID del usuario
 * @returns Lista de cuentas externas vinculadas
 */
export async function getLinkedAccountsByUser(
  userId: string
): Promise<Prisma.linked_accountsGetPayload<{}>[]> {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return [];
  }

  try {
    return await prisma.linked_accounts.findMany({
      where: {
        user_id: userId.trim(),
      },
      orderBy: {
        created_at: "asc",
      },
    });
  } catch (error) {
    console.error("Error al listar cuentas vinculadas del usuario:", error);
    return [];
  }
}

/**
 * Desvincula una cuenta externa específica de un usuario.
 *
 * @param userId UUID del usuario
 * @param provider Nombre del proveedor
 * @param providerAccountId ID de la cuenta en el proveedor
 * @returns true si se desvinculó con éxito, false en caso contrario
 */
export async function unlinkAccount(
  userId: string,
  provider: string,
  providerAccountId: string
): Promise<boolean> {
  if (
    !userId ||
    !provider ||
    !providerAccountId ||
    typeof userId !== "string" ||
    typeof provider !== "string" ||
    typeof providerAccountId !== "string"
  ) {
    return false;
  }

  try {
    const deleted = await prisma.linked_accounts.deleteMany({
      where: {
        user_id: userId.trim(),
        provider: normalizeProvider(provider),
        provider_account_id: normalizeProviderAccountId(providerAccountId),
      },
    });

    return deleted.count > 0;
  } catch (error) {
    console.error("Error al desvincular cuenta externa:", error);
    return false;
  }
}

