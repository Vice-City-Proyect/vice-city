export class UserAlreadyExistsError extends Error {
  readonly code = "USER_ALREADY_EXISTS";

  constructor(message = "El correo electrónico ya se encuentra registrado") {
    super(message);
    this.name = "UserAlreadyExistsError";
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      ((instance as any).code === "USER_ALREADY_EXISTS" ||
        (instance as any).name === "UserAlreadyExistsError")
    );
  }
}

export class RoleNotFoundError extends Error {
  readonly code = "ROLE_NOT_FOUND";

  constructor(message = "El rol CLIENT no se encuentra en el sistema") {
    super(message);
    this.name = "RoleNotFoundError";
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      ((instance as any).code === "ROLE_NOT_FOUND" ||
        (instance as any).name === "RoleNotFoundError")
    );
  }
}

export class AuthValidationError extends Error {
  readonly code = "AUTH_VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "AuthValidationError";
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      ((instance as any).code === "AUTH_VALIDATION_ERROR" ||
        (instance as any).name === "AuthValidationError")
    );
  }
}

export class InvalidTokenError extends Error {
  readonly code = "INVALID_TOKEN";

  constructor(message = "El token de confirmación no es válido") {
    super(message);
    this.name = "InvalidTokenError";
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      ((instance as any).code === "INVALID_TOKEN" ||
        (instance as any).name === "InvalidTokenError")
    );
  }
}

export class TokenExpiredError extends Error {
  readonly code = "TOKEN_EXPIRED";

  constructor(message = "El token de confirmación ha expirado") {
    super(message);
    this.name = "TokenExpiredError";
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      ((instance as any).code === "TOKEN_EXPIRED" ||
        (instance as any).name === "TokenExpiredError")
    );
  }
}

export class TokenAlreadyUsedError extends Error {
  readonly code = "TOKEN_ALREADY_USED";

  constructor(message = "El token de confirmación ya ha sido utilizado") {
    super(message);
    this.name = "TokenAlreadyUsedError";
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      ((instance as any).code === "TOKEN_ALREADY_USED" ||
        (instance as any).name === "TokenAlreadyUsedError")
    );
  }
}

export class EmailAlreadyConfirmedError extends Error {
  readonly code = "EMAIL_ALREADY_CONFIRMED";

  constructor(message = "El correo electrónico ya ha sido confirmado previamente") {
    super(message);
    this.name = "EmailAlreadyConfirmedError";
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      ((instance as any).code === "EMAIL_ALREADY_CONFIRMED" ||
        (instance as any).name === "EmailAlreadyConfirmedError")
    );
  }
}

export class UserNotFoundError extends Error {
  readonly code = "USER_NOT_FOUND";

  constructor(message = "No se encontró ningún usuario con el correo electrónico proporcionado") {
    super(message);
    this.name = "UserNotFoundError";
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      ((instance as any).code === "USER_NOT_FOUND" ||
        (instance as any).name === "UserNotFoundError")
    );
  }
}

export class UserAlreadyVerifiedError extends Error {
  readonly code = "USER_ALREADY_VERIFIED";

  constructor(message = "El correo electrónico ya ha sido verificado previamente.") {
    super(message);
    this.name = "UserAlreadyVerifiedError";
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      ((instance as any).code === "USER_ALREADY_VERIFIED" ||
        (instance as any).name === "UserAlreadyVerifiedError")
    );
  }
}

export class EmailNotVerifiedError extends Error {
  readonly code = "EMAIL_NOT_VERIFIED";

  constructor(message = "Debes confirmar tu correo electrónico antes de iniciar sesión.") {
    super(message);
    this.name = "EmailNotVerifiedError";
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      ((instance as any).code === "EMAIL_NOT_VERIFIED" ||
        (instance as any).name === "EmailNotVerifiedError")
    );
  }
}

