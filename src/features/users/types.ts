import { Prisma } from "@prisma/client";

/** Datos requeridos para crear un usuario */
export type CreateUserData = {
  role_id: string;
  email: string;
  full_name: string;
  password_hash?: string;
  phone?: string;
  document_id?: string;
};

/** Usuario tal como lo devuelve Prisma (incluyendo la relación con roles) */
export type UserWithRole = Prisma.usersGetPayload<{
  include: { roles: true };
}>;
