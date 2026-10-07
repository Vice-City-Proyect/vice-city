export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: Date;
}

export interface ConfirmEmailInput {
  token: string;
}

export interface ConfirmEmailResult {
  email: string;
  emailVerified: boolean;
  message?: string;
}

export interface ResendConfirmationInput {
  email: string;
}

export interface ResendConfirmationResult {
  success: boolean;
  message: string;
}

