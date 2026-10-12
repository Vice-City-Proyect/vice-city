import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as confirmEmail } from "../../src/app/api/auth/confirm-email/route.ts";
import { POST as resendConfirmation } from "../../src/app/api/auth/resend-confirmation/route.ts";
import {
  TokenExpiredError,
  InvalidTokenError,
  UserAlreadyVerifiedError,
  UserNotFoundError,
} from "../../src/features/auth/errors/email-confirmation.errors.ts";

function createRequest(url, body, contentType = "application/json") {
  const headers = new Headers();
  if (contentType) headers.set("content-type", contentType);
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("API POST /api/auth/confirm-email", () => {
  const URL = "http://localhost:3000/api/auth/confirm-email";
  const fake = (impl) => ({ confirmEmail: impl });

  it("400 si el Content-Type es incorrecto", async () => {
    const res = await confirmEmail(createRequest(URL, { token: "t" }, "text/plain"), {
      serviceOverride: fake(async () => ({})),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "INVALID_CONTENT_TYPE");
  });

  it("400 si falta el token (validación estricta)", async () => {
    const res = await confirmEmail(createRequest(URL, {}), {
      serviceOverride: fake(async () => ({})),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "VALIDATION_ERROR");
  });

  it("200 confirma el correo", async () => {
    const res = await confirmEmail(createRequest(URL, { token: "abc" }), {
      serviceOverride: fake(async () => ({ success: true, userId: "u1", email: "a@b.com" })),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).success, true);
  });

  it("410 si el token expiró", async () => {
    const res = await confirmEmail(createRequest(URL, { token: "abc" }), {
      serviceOverride: fake(async () => {
        throw new TokenExpiredError();
      }),
    });
    assert.equal(res.status, 410);
    assert.equal((await res.json()).error, "TOKEN_EXPIRED");
  });

  it("409 si el correo ya estaba confirmado", async () => {
    const res = await confirmEmail(createRequest(URL, { token: "abc" }), {
      serviceOverride: fake(async () => {
        throw new UserAlreadyVerifiedError();
      }),
    });
    assert.equal(res.status, 409);
  });

  it("400 si el token es inválido", async () => {
    const res = await confirmEmail(createRequest(URL, { token: "abc" }), {
      serviceOverride: fake(async () => {
        throw new InvalidTokenError();
      }),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "INVALID_TOKEN");
  });

  it("404 si no existe el usuario", async () => {
    const res = await confirmEmail(createRequest(URL, { token: "abc" }), {
      serviceOverride: fake(async () => {
        throw new UserNotFoundError();
      }),
    });
    assert.equal(res.status, 404);
  });
});

describe("API POST /api/auth/resend-confirmation", () => {
  const URL = "http://localhost:3000/api/auth/resend-confirmation";
  const fake = (impl) => ({ resendVerificationEmail: impl });

  it("400 si el correo es inválido", async () => {
    const res = await resendConfirmation(createRequest(URL, { email: "no-es-correo" }), {
      serviceOverride: fake(async () => ({})),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "VALIDATION_ERROR");
  });

  it("400 si hay campos extra (.strict())", async () => {
    const res = await resendConfirmation(createRequest(URL, { email: "a@b.com", x: 1 }), {
      serviceOverride: fake(async () => ({})),
    });
    assert.equal(res.status, 400);
  });

  it("200 reenvía la confirmación (normaliza el correo)", async () => {
    const calls = [];
    const res = await resendConfirmation(createRequest(URL, { email: "  A@B.com " }), {
      serviceOverride: fake(async (email) => {
        calls.push(email);
        return { success: true, email, expiresAt: new Date() };
      }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).success, true);
    assert.equal(calls[0], "a@b.com");
  });

  it("404 si el usuario no existe", async () => {
    const res = await resendConfirmation(createRequest(URL, { email: "a@b.com" }), {
      serviceOverride: fake(async () => {
        throw new UserNotFoundError();
      }),
    });
    assert.equal(res.status, 404);
  });

  it("409 si el correo ya estaba confirmado", async () => {
    const res = await resendConfirmation(createRequest(URL, { email: "a@b.com" }), {
      serviceOverride: fake(async () => {
        throw new UserAlreadyVerifiedError();
      }),
    });
    assert.equal(res.status, 409);
  });
});