import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import { authOptions, getAuthSecret } from "@/lib/auth";

/**
 * Endpoint de consulta de sesión activa (HU02-B y HU05-B)
 * Permite a la interfaz o clientes API verificar el estado de autenticación
 * y acceder a id, email y role del usuario.
 *
 * Criterio de Aceptación:
 * "Iniciar sesión con Google devuelve la sesión con id, email y role."
 */
export async function GET(request?: Request, sessionOverride?: any) {
  try {
    let session = sessionOverride ?? null;

    if (!sessionOverride) {
      try {
        session = await getServerSession(authOptions);
      } catch (sessionError: any) {
        // En entorno de tests unitarios fuera del runtime de servidor de Next.js,
        // getServerSession no tiene request store y lanza 'outside a request scope'.
        if (sessionError?.message?.includes("outside a request scope")) {
          session = null;
        } else {
          throw sessionError;
        }
      }

      // Resiliencia perimetral: si getServerSession no resolvió y request tiene cookies, usar getToken
      if ((!session || !session.user) && request) {
        try {
          const token = await getToken({
            req: request as any,
            secret: getAuthSecret(),
          });
          if (token && (token.role || token.email)) {
            const rawRole = typeof token.role === "string" ? token.role.trim().toUpperCase() : "";
            const role = rawRole === "CUSTOMER" ? "CLIENT" : rawRole;
            session = {
              user: {
                id: (token.id as string) || (token.sub as string),
                email: token.email as string,
                name: token.name as string,
                role: role || "CLIENT",
              },
              expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
            };
          }
        } catch {
          // Ignorar fallo de getToken
        }
      }
    }

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: true,
          authenticated: false,
          data: null,
        },
        { status: 200 }
      );
    }

    const userData = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    };

    return NextResponse.json(
      {
        success: true,
        authenticated: true,
        // Compatibilidad con clientes nativos de NextAuth (useSession, getSession)
        user: userData,
        // Compatibilidad con contratos existentes del backend (HU02-B, HU05-B)
        data: userData,
        expires:
          session.expires ||
          new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[API_AUTH_SESSION_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error al consultar la sesión del usuario",
      },
      { status: 500 }
    );
  }
}
