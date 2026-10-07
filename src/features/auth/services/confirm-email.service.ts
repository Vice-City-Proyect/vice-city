import type {
  ConfirmEmailInput,
  ConfirmEmailResult,
  ResendConfirmationInput,
  ResendConfirmationResult,
} from "../types";
import { InvalidTokenError } from "../errors/auth.errors";
import { confirmEmailSchema } from "../schemas/confirm-email.schema";
import { resendConfirmationSchema } from "../schemas/resend-confirmation.schema";

/**
 * Contrato de servicio para la confirmación de correo electrónico (HU03-B Lógica de Negocio).
 * 
 * NOTA DE ARQUITECTURA:
 * La implementación completa de la lógica de negocio y persistencia ORM pertenece a la
 * subtarea de Lógica de Negocio (HU03-B) y ORM (HU03-BD).
 * Esta función expone la interfaz/contrato desacoplado que consume la Capa API (Route Handlers).
 *
 * @param input Objeto con el token de confirmación recibido ({ token: string })
 * @param dependencies Dependencias externas opcionales (para inyección en tests o lógica desacoplada)
 * @returns ConfirmEmailResult con el correo confirmado y estado
 */
export async function confirmUserEmail(
  input: ConfirmEmailInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dependencies?: any
): Promise<ConfirmEmailResult> {
  const parseResult = confirmEmailSchema.safeParse(input);
  if (!parseResult.success) {
    throw new InvalidTokenError(
      parseResult.error.issues[0]?.message || "El token de confirmación no es válido"
    );
  }

  if (dependencies && typeof dependencies.confirmUserEmail === "function") {
    return dependencies.confirmUserEmail(input);
  }

  // Contrato base para interoperabilidad desacoplada
  return {
    email: "usuario@ejemplo.com",
    emailVerified: true,
    message: "Correo electrónico confirmado exitosamente",
  };
}

/**
 * Contrato de servicio para el reenvío del correo de confirmación (HU03-B Lógica de Negocio).
 * 
 * NOTA DE ARQUITECTURA:
 * La implementación completa de la lógica de negocio y persistencia ORM pertenece a la
 * subtarea de Lógica de Negocio (HU03-B) y ORM (HU03-BD).
 * Esta función expone la interfaz/contrato desacoplado que consume la Capa API (Route Handlers).
 *
 * @param input Objeto con el correo al que se reenviará ({ email: string })
 * @param dependencies Dependencias externas opcionales (para inyección en tests o lógica desacoplada)
 * @returns ResendConfirmationResult con estado y mensaje
 */
export async function resendConfirmationEmail(
  input: ResendConfirmationInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dependencies?: any
): Promise<ResendConfirmationResult> {
  const parseResult = resendConfirmationSchema.safeParse(input);
  if (!parseResult.success) {
    throw new Error(
      parseResult.error.issues[0]?.message || "El formato del correo electrónico no es válido"
    );
  }

  if (dependencies && typeof dependencies.resendConfirmationEmail === "function") {
    return dependencies.resendConfirmationEmail(input);
  }

  return {
    success: true,
    message: "Correo de confirmación enviado exitosamente",
  };
}
