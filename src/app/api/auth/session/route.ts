import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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
