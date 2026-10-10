/**
 * Mapeo y resolución de errores de Google OAuth / NextAuth a mensajes legibles en español (HU05-B)
 *
 * Cumple con el Criterio de Aceptación:
 * "Caso de error: si el usuario cancela o Google falla, se redirige al login con un mensaje claro."
 */

export const GOOGLE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Has cancelado el inicio de sesión con Google. Por favor, intenta de nuevo si deseas ingresar.",
  AccessDenied: "Has cancelado el inicio de sesión con Google. Por favor, intenta de nuevo si deseas ingresar.",
  OAuthSignin: "No se pudo conectar con el proveedor de Google. Por favor, verifica tu conexión o intenta más tarde.",
  OAuthCallback: "Ocurrió un error al procesar la respuesta de autenticación de Google. Por favor, intenta nuevamente.",
  OAuthCreateAccount: "No se pudo registrar la cuenta de usuario asociada a Google.",
  OAuthAccountNotLinked: "Este correo ya está registrado con otro método. Se requiere iniciar sesión con tus credenciales previas para vincular Google.",
  GoogleEmailNotProvided: "No se pudo autenticar con Google porque la cuenta no proporcionó una dirección de correo electrónico.",
  UserInactive: "Tu cuenta se encuentra inactiva. Por favor, comunícate con la administración del complejo.",
  GoogleAuthFailed: "Ocurrió un error durante la autenticación con Google. Por favor, inténtalo de nuevo.",
  Configuration: "Existe un problema en la configuración del proveedor de Google en el servidor.",
  Default: "Ocurrió un error inesperado al autenticar con Google. Por favor, intenta de nuevo.",
};

/**
 * Retorna un mensaje amigable y claro en español para cualquier código de error de OAuth/NextAuth.
 *
 * @param errorCode Código de error proveniente de NextAuth (query param ?error=...) o de dominio
 * @returns Mensaje descriptivo en español
 */
export function resolveGoogleAuthErrorMessage(errorCode?: string | null): string {
  if (!errorCode || typeof errorCode !== "string") {
    return GOOGLE_AUTH_ERROR_MESSAGES.Default;
  }
  const cleanCode = errorCode.trim();
  return GOOGLE_AUTH_ERROR_MESSAGES[cleanCode] || GOOGLE_AUTH_ERROR_MESSAGES.Default;
}

