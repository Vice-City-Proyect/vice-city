
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata = {
  title: 'Iniciar Sesión | Vice City',
  description: 'Accede al sistema de reservas Vice City Sports.',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full bg-club-bg flex items-center justify-center p-4 sm:p-8">
      <LoginForm />
    </main>
  );
}
