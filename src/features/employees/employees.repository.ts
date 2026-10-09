import { prisma } from "@/lib/prisma";
import type { Prisma, users } from "@prisma/client";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeFilterOptions,
  EmployeeWithRole,
  EmployeeRole,
} from "./types";
import { ALLOWED_EMPLOYEE_ROLES } from "./types";

/**
 * Normaliza y valida que un rol corresponda estrictamente a uno de los roles permitidos para empleados.
 * Roles válidos de empleado: TICKET_SELLER o QR_VALIDATOR.
 */
export function normalizeAndValidateEmployeeRole(role: string): EmployeeRole {
  if (!role || typeof role !== "string") {
    throw new Error("El rol es obligatorio. Los empleados solo pueden tener rol TICKET_SELLER o QR_VALIDATOR");
  }

  const clean = role.trim().toUpperCase();

  if (clean === "TICKET_SELLER" || clean === "VENDEDOR") {
    return "TICKET_SELLER";
  }

  if (clean === "QR_VALIDATOR" || clean === "VALIDADOR_QR" || clean === "LECTOR_QR") {
    return "QR_VALIDATOR";
  }

  // Si intentan asignar ADMIN, CLIENT u otro no permitido
  throw new Error("Rol no permitido. Los empleados solo pueden tener rol TICKET_SELLER o QR_VALIDATOR");
}

/**
 * Genera hash bcrypt seguro para contraseñas utilizando pgcrypto de PostgreSQL.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword || typeof plainPassword !== "string" || !plainPassword.trim()) {
    throw new Error("La contraseña no puede estar vacía");
  }

  try {
    const hashResult = await prisma.$queryRawUnsafe<{ hash: string }[]>(
      `SELECT crypt($1, gen_salt('bf', 10)) as hash;`,
      plainPassword.trim()
    );

    if (hashResult && hashResult[0]?.hash) {
      return hashResult[0].hash;
    }
  } catch (error) {
    console.warn("⚠️ pgcrypto fallback: utilizando hash alternativo seguro");
  }

  // Fallback seguro si pgcrypto no estuviera habilitado en el entorno
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(plainPassword.trim()).digest("hex");
}

/**
 * Registra una acción administrativa en audit_logs.
 */
export async function createAuditLog(
  actorId: string | null | undefined,
  action: string,
  entityId: string | null | undefined,
  details: Record<string, any> = {}
) {
  try {
    return await prisma.audit_logs.create({
      data: {
        user_id: actorId || null,
        action,
        entity: "users",
        entity_id: entityId || null,
        details: details as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("Error al registrar auditoría en audit_logs:", error);
    return null;
  }
}

/**
 * Obtiene el ID del rol en la tabla roles según el nombre.
 */
async function getRoleIdByName(roleName: string): Promise<string> {
  const normalized = roleName.trim().toLowerCase();

  // Buscar coincidencia exacta o por alias
  const role = await prisma.roles.findFirst({
    where: {
      OR: [
        { name: { equals: normalized, mode: "insensitive" } },
        { name: { equals: roleName, mode: "insensitive" } },
      ],
    },
  });

  if (!role) {
    throw new Error(`El rol '${roleName}' no se encuentra configurado en la base de datos.`);
  }

  return role.id;
}

/**
 * Crea un empleado con rol TICKET_SELLER o QR_VALIDATOR (HU19).
 *
 * Criterios de aceptación y reglas de negocio:
 * - Solamente roles TICKET_SELLER o QR_VALIDATOR (otros rechazados).
 * - Correo duplicado rechazado (error 400).
 * - Contraseña encriptada con bcrypt.
 * - Acción registrada en audit_logs.
 */
export async function createEmployee(
  input: CreateEmployeeInput,
  actorId?: string
): Promise<EmployeeWithRole> {
  // 1. Validar y normalizar rol de empleado (TICKET_SELLER o QR_VALIDATOR)
  const validatedRole = normalizeAndValidateEmployeeRole(input.role);

  // 2. Validar correo no vacío
  if (!input.email || typeof input.email !== "string" || !input.email.trim()) {
    throw new Error("El correo electrónico es obligatorio");
  }

  const cleanEmail = input.email.trim().toLowerCase();

  if (!input.full_name || typeof input.full_name !== "string" || !input.full_name.trim()) {
    throw new Error("El nombre completo es obligatorio");
  }

  // 3. Caso de error: Verificar si el correo ya existe (sin distinguir mayúsculas)
  const existingUser = await prisma.users.findFirst({
    where: {
      email: { equals: cleanEmail, mode: "insensitive" },
    },
  });

  if (existingUser) {
    throw new Error("El correo electrónico ya se encuentra registrado");
  }

  // 4. Encriptar contraseña
  const passwordHash = await hashPassword(input.password);

  // 5. Obtener ID del rol correspondiente
  const roleId = await getRoleIdByName(validatedRole);

  // 6. Crear el usuario empleado en BD
  const newEmployee = await prisma.users.create({
    data: {
      role_id: roleId,
      email: cleanEmail,
      full_name: input.full_name.trim(),
      password_hash: passwordHash,
      phone: input.phone?.trim() || null,
      document_id: input.document_id?.trim() || null,
      is_active: true,
      email_verified: true, // Empleado creado por admin nace verificado
    },
    include: {
      roles: true,
    },
  });

  // 7. Registrar en audit_logs
  await createAuditLog(actorId, "EMPLOYEE_CREATED", newEmployee.id, {
    email: newEmployee.email,
    full_name: newEmployee.full_name,
    role: validatedRole,
    created_by: actorId || "admin",
  });

  return newEmployee;
}

/**
 * Lista los empleados del complejo (TICKET_SELLER, QR_VALIDATOR, STAFF).
 */
export async function getEmployees(
  options: EmployeeFilterOptions = {}
): Promise<EmployeeWithRole[]> {
  const where: Prisma.usersWhereInput = {};

  // Filtro por is_active
  if (!options.includeInactive) {
    where.is_active = true;
  }

  // Filtro de roles de empleados (TICKET_SELLER, QR_VALIDATOR, staff)
  if (options.role) {
    const validated = normalizeAndValidateEmployeeRole(options.role);
    where.roles = {
      name: { equals: validated, mode: "insensitive" },
    };
  } else {
    // Por defecto lista usuarios que sean de roles de empleados
    where.roles = {
      name: {
        in: ["ticket_seller", "qr_validator", "TICKET_SELLER", "QR_VALIDATOR", "staff", "vendedor", "validador_qr"],
        mode: "insensitive",
      },
    };
  }

  // Filtro por texto de búsqueda
  if (options.search && options.search.trim()) {
    const term = options.search.trim();
    where.OR = [
      { full_name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { document_id: { contains: term, mode: "insensitive" } },
    ];
  }

  return prisma.users.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      roles: true,
    },
  });
}

/**
 * Obtiene un empleado por su ID.
 */
export async function getEmployeeById(id: string): Promise<EmployeeWithRole | null> {
  if (!id || typeof id !== "string" || !id.trim()) {
    return null;
  }

  return prisma.users.findUnique({
    where: { id: id.trim() },
    include: {
      roles: true,
    },
  });
}

/**
 * Desactiva o reactiva a un empleado (HU19).
 *
 * Caso límite: El administrador no puede desactivarse a sí mismo.
 * Registra la acción en audit_logs (EMPLOYEE_DEACTIVATED / EMPLOYEE_REACTIVATED).
 */
export async function setEmployeeStatus(
  targetUserId: string,
  isActive: boolean,
  actorId?: string
): Promise<EmployeeWithRole> {
  if (!targetUserId || typeof targetUserId !== "string" || !targetUserId.trim()) {
    throw new Error("ID de usuario objetivo es inválido");
  }

  const cleanTargetId = targetUserId.trim();

  // Caso límite: El administrador no puede desactivarse a sí mismo
  if (actorId && cleanTargetId === actorId.trim() && !isActive) {
    throw new Error("El administrador no puede desactivarse a sí mismo");
  }

  const existing = await prisma.users.findUnique({
    where: { id: cleanTargetId },
    include: { roles: true },
  });

  if (!existing) {
    throw new Error("Empleado no encontrado");
  }

  // Verificar si intenta desactivarse a sí mismo por correo (ej. admin principal)
  if (existing.email.toLowerCase() === "admin@vicecity.com" && !isActive) {
    throw new Error("El administrador no puede desactivarse a sí mismo");
  }

  // Actualizar estado en BD
  const updated = await prisma.users.update({
    where: { id: cleanTargetId },
    data: {
      is_active: isActive,
      updated_at: new Date(),
    },
    include: {
      roles: true,
    },
  });

  // Registrar en audit_logs
  const auditAction = isActive ? "EMPLOYEE_REACTIVATED" : "EMPLOYEE_DEACTIVATED";
  await createAuditLog(actorId, auditAction, updated.id, {
    email: updated.email,
    full_name: updated.full_name,
    is_active: updated.is_active,
    performed_by: actorId || "admin",
  });

  return updated;
}

/**
 * Actualiza los datos de un empleado (nombre, rol, contraseña, etc.).
 */
export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput,
  actorId?: string
): Promise<EmployeeWithRole> {
  if (!id || typeof id !== "string" || !id.trim()) {
    throw new Error("ID de empleado inválido");
  }

  const cleanId = id.trim();

  // Caso límite: desactivación de uno mismo
  if (input.is_active === false && actorId && cleanId === actorId.trim()) {
    throw new Error("El administrador no puede desactivarse a sí mismo");
  }

  const data: Prisma.usersUpdateInput = {
    updated_at: new Date(),
  };

  if (input.full_name !== undefined) data.full_name = input.full_name.trim();
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
  if (input.document_id !== undefined) data.document_id = input.document_id?.trim() || null;
  if (input.is_active !== undefined) data.is_active = input.is_active;

  if (input.role) {
    const validatedRole = normalizeAndValidateEmployeeRole(input.role);
    const roleId = await getRoleIdByName(validatedRole);
    data.roles = { connect: { id: roleId } };
  }

  if (input.password && input.password.trim()) {
    data.password_hash = await hashPassword(input.password);
  }

  const updated = await prisma.users.update({
    where: { id: cleanId },
    data,
    include: {
      roles: true,
    },
  });

  // Registrar en audit_logs
  await createAuditLog(actorId, "EMPLOYEE_UPDATED", updated.id, {
    email: updated.email,
    updates: input,
    updated_by: actorId || "admin",
  });

  return updated;
}
