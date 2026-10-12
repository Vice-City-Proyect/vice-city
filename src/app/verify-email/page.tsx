import { Suspense } from "react";
import { VerifyEmailClient } from "@/features/auth/components/VerifyEmailClient";

export const metadata = {
  title: "Confirmar Correo | Vice City",
  description: "Confirma tu correo electrónico para activar tu cuenta.",
};

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen w-full bg-club-bg flex items-center justify-center p-4 sm:p-8">
      <Suspense fallback={null}>
        <VerifyEmailClient />
      </Suspense>
    </main>
  );
}