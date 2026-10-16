/**
 * Validaciones puras de empleados (HU19 / VCP-78). Se usan tanto en el servidor
 * (`createEmployee`) como en el formulario de la pantalla, para que ambos apliquen la misma regla.
 */

export const EMPLOYEE_ROLE_OPTIONS = [
  { value: 'TICKET_SELLER', label: 'Vendedor de tiquetes' },
  { value: 'QR_VALIDATOR', label: 'Validador QR' },
] as const;

export type EmployeeRoleValue = (typeof EMPLOYEE_ROLE_OPTIONS)[number]['value'];

export const EMPLOYEE_PASSWORD_MIN_LENGTH = 8;
/** Límite real de bcrypt: más allá de 72 caracteres la contraseña se trunca en silencio. */
export const EMPLOYEE_PASSWORD_MAX_LENGTH = 72;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Devuelve el mensaje de error de la contraseña, o null si es válida. */
export function validateEmployeePassword(password: unknown): string | null {
  if (typeof password !== 'string' || !password.trim()) {
    return 'La contraseña es obligatoria';
  }
  if (password.length < EMPLOYEE_PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${EMPLOYEE_PASSWORD_MIN_LENGTH} caracteres`;
  }
  if (password.length > EMPLOYEE_PASSWORD_MAX_LENGTH) {
    return `La contraseña no puede exceder ${EMPLOYEE_PASSWORD_MAX_LENGTH} caracteres`;
  }
  return null;
}

export interface EmployeeFormValues {
  fullName: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  documentId: string;
}

export type EmployeeFormErrors = Partial<Record<keyof EmployeeFormValues, string>>;

/** Valida el formulario de alta de empleado; devuelve un objeto vacío si todo es correcto. */
export function validateEmployeeForm(values: EmployeeFormValues): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {};

  if (values.fullName.trim().length < 2) {
    errors.fullName = 'Ingresa el nombre completo (mínimo 2 caracteres)';
  } else if (values.fullName.trim().length > 100) {
    errors.fullName = 'El nombre no puede exceder 100 caracteres';
  }

  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Ingresa un correo electrónico válido';
  }

  const passwordError = validateEmployeePassword(values.password);
  if (passwordError) errors.password = passwordError;

  if (!EMPLOYEE_ROLE_OPTIONS.some((option) => option.value === values.role)) {
    errors.role = 'Selecciona un rol de empleado';
  }

  if (values.phone.trim().length > 25) {
    errors.phone = 'El teléfono no puede exceder 25 caracteres';
  }

  return errors;
}
