import { z } from "zod";

/**
 * Esquema estricto para cambiar el rol de un usuario (HU07-B API)
 */
export const changeUserRoleSchema = z
  .object({
    role: z
      .string({
        error: "El campo 'role' es obligatorio",
      })
      .trim()
      .toUpperCase()
      .pipe(
        z.enum(["ADMIN", "CLIENT", "TICKET_SELLER", "QR_VALIDATOR"], {
          error: "El rol especificado no es válido. Los roles autorizados son: ADMIN, CLIENT, TICKET_SELLER, QR_VALIDATOR",
        })
      ),
    reason: z
      .string()
      .trim()
      .max(255, "El motivo no puede exceder los 255 caracteres")
      .optional()
      .nullable(),
  })
  .strict();

export type ChangeUserRoleInput = z.infer<typeof changeUserRoleSchema>;

/**
 * Esquema para los parámetros de paginación y búsqueda en listado de usuarios
 */
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  role: z
    .string()
    .trim()
    .toUpperCase()
    .optional(),
});

export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;
