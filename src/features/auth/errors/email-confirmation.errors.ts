export class TokenExpiredError extends Error {
  public readonly code = "TOKEN_EXPIRED";
  constructor(message: string = "El enlace de confirmación ha expirado. Por favor, solicita uno nuevo.") {
    super(message);
    this.name = "TokenExpiredError";
  }
}

export class InvalidTokenError extends Error {
  public readonly code = "INVALID_TOKEN";
  constructor(message: string = "El token de confirmación no es válido o ya fue utilizado.") {
    super(message);
    this.name = "InvalidTokenError";
  }
}

export class UserAlreadyVerifiedError extends Error {
  public readonly code = "USER_ALREADY_VERIFIED";
  constructor(message: string = "El correo electrónico ya ha sido verificado previamente.") {
    super(message);
    this.name = "UserAlreadyVerifiedError";
  }
}

export class UserNotFoundError extends Error {
  public readonly code = "USER_NOT_FOUND";
  constructor(message: string = "No se encontró ningún usuario asociado al correo electrónico.") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

export class TokenAlreadyUsedError extends Error {
  public readonly code = "TOKEN_ALREADY_USED";
  constructor(message: string = "El token de confirmación ya ha sido utilizado anteriormente.") {
    super(message);
    this.name = "TokenAlreadyUsedError";
  }
}

export class EmailAlreadyConfirmedError extends Error {
  public readonly code = "EMAIL_ALREADY_CONFIRMED";
  constructor(message: string = "El correo electrónico ya ha sido confirmado previamente.") {
    super(message);
    this.name = "EmailAlreadyConfirmedError";
  }
}

export { EmailNotVerifiedError } from "./auth.errors";

