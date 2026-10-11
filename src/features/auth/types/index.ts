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

