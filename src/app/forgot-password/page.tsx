import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata = {
  title: "Recuperar Contraseña | Vice City",
  description: "Solicita un enlace para restablecer tu contraseña.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen w-full bg-club-bg flex items-center justify-center p-4 sm:p-8">
      <ForgotPasswordForm />
    </main>
  );
}