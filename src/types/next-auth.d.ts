import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

export type SRSRole = "ADMIN" | "CLIENT" | "TICKET_SELLER" | "QR_VALIDATOR";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    role: SRSRole;
  }

  interface Session {
    user: {
      id: string;
      role: SRSRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: SRSRole;
  }
}

