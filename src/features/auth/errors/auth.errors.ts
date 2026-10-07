export class UserAlreadyExistsError extends Error {
  readonly code = "USER_ALREADY_EXISTS";

  constructor(message = "El correo electrónico ya se encuentra registrado") {
    super(message);
    this.name = "UserAlreadyExistsError";
  }
}

export class RoleNotFoundError extends Error {
  readonly code = "ROLE_NOT_FOUND";

  constructor(message = "El rol CLIENT no se encuentra en el sistema") {
    super(message);
    this.name = "RoleNotFoundError";
  }
}

export class AuthValidationError extends Error {
  readonly code = "AUTH_VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "AuthValidationError";
  }
}

export class InvalidTokenError extends Error {
  readonly code = "INVALID_TOKEN";

  constructor(message = "El token de confirmación no es válido") {
    super(message);
    this.name = "InvalidTokenError";
  }
}

export class TokenExpiredError extends Error {
  readonly code = "TOKEN_EXPIRED";

  constructor(message = "El token de confirmación ha expirado") {
    super(message);
    this.name = "TokenExpiredError";
  }
}

export class TokenAlreadyUsedError extends Error {
  readonly code = "TOKEN_ALREADY_USED";

  constructor(message = "El token de confirmación ya ha sido utilizado") {
    super(message);
    this.name = "TokenAlreadyUsedError";
  }
}

export class EmailAlreadyConfirmedError extends Error {
  readonly code = "EMAIL_ALREADY_CONFIRMED";

  constructor(message = "El correo electrónico ya ha sido confirmado previamente") {
    super(message);
    this.name = "EmailAlreadyConfirmedError";
  }
}

export class UserNotFoundError extends Error {
  readonly code = "USER_NOT_FOUND";

  constructor(message = "No se encontró ningún usuario con el correo electrónico proporcionado") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

