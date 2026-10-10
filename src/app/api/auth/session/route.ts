import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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
        // En entorno de tests unitarios fuera del runtime de servidor de Next.js
        if (sessionError?.message?.includes("outside a request scope")) {
          session = null;
        } else {
          throw sessionError;
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

    return NextResponse.json(
      {
        success: true,
        authenticated: true,
        data: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
        },
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

