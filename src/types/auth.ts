

export type UserRole = 'ADMIN' | 'CLIENT'
export interface LoginFormData {
  email: string;
  password: string;
}


export interface AuthSessionUser {

  id: string;
  name: string;
  email: string;
  role: UserRole;
}
