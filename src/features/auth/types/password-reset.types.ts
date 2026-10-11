export interface RequestPasswordResetResult {
  success: boolean;
  message: string;
  token?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  message: string;
}

export interface ValidateTokenStatusResult {
  isValid: boolean;
  reason?: string;
}
