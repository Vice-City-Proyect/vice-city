import RegisterForm from "@/features/auth/components/RegisterForm";

export const metadata = {
  title: "Registro | Vice City",
  description: "Crea tu cuenta en Vice City Club.",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen w-full bg-club-bg flex items-center justify-center p-4 sm:p-8">
      <RegisterForm />
    </main>
  );
}

