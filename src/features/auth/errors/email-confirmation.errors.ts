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
