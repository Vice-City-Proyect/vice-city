import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "../schemas/register.schema";
import {
  UserAlreadyExistsError,
  RoleNotFoundError,
  AuthValidationError,
} from "../errors/auth.errors";
import type { RegisterInput, RegisteredUser } from "../types";

export async function registerUser(
  input: RegisterInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any = prisma
): Promise<RegisteredUser> {
  const parseResult = registerSchema.safeParse(input);
  if (!parseResult.success) {
    throw new AuthValidationError(
      parseResult.error.issues.map((i) => i.message).join(", ")
    );
  }

  const { fullName, email, password } = parseResult.data;

  // 1. Verificar si el correo ya existe (búsqueda insensible a mayúsculas/minúsculas)
  const existingUser = await db.users.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
  });

  if (existingUser) {
    throw new UserAlreadyExistsError();
  }

  // 2. Obtener rol de cliente
  const clientRole = await db.roles.findFirst({
    where: {
      name: {
        in: ["CLIENT", "client", "customer", "CUSTOMER"],
        mode: "insensitive",
      },
    },
  });

  if (!clientRole) {
    throw new RoleNotFoundError();
  }

  // 3. Encriptar contraseña con factor de costo 10
  const passwordHash = await hashPassword(password);

  // 4. Crear usuario en la base de datos
  const newUser = await db.users.create({
    data: {
      email,
      full_name: fullName,
      password_hash: passwordHash,
      role_id: clientRole.id,
    },
    include: {
      roles: true,
    },
  });

  return {
    id: newUser.id,
    email: newUser.email,
    fullName: newUser.full_name,
    role: newUser.roles?.name ?? "CLIENT",
    createdAt: newUser.created_at,
  };
}

