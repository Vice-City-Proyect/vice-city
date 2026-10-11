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

