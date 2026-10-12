import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Route Handler principal de NextAuth para Vice City
 * Expone endpoints estándar para OAuth (Google), credenciales, sesiones y callbacks:
 * - GET/POST /api/auth/signin/google
 * - GET/POST /api/auth/callback/google
 * - GET /api/auth/session
 * - GET /api/auth/csrf
 * - GET /api/auth/providers
 * - POST /api/auth/signout
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

