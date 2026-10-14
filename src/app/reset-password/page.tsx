import { Suspense } from "react";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export const metadata = {
  title: "Restablecer Contraseña | Vice City",
  description: "Define una nueva contraseña para tu cuenta.",
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen w-full bg-club-bg flex items-center justify-center p-4 sm:p-8">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}