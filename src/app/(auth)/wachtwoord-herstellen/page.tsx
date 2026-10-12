import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/components/auth/auth-forms";
import { Alert } from "@/components/ui/form";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nieuw wachtwoord instellen", robots: { index: false } };

export default async function ResetPasswordPage() {
  const { user } = await getCurrentUser();
  return (
    <>
      <h1 className="font-serif text-3xl text-sand-900">Nieuw wachtwoord</h1>
      {user ? (
        <>
          <p className="mt-2 text-sand-600">Kies een nieuw wachtwoord voor {user.email}.</p>
          <div className="mt-6"><NewPasswordForm /></div>
        </>
      ) : (
        <div className="mt-6 space-y-4">
          <Alert>Deze pagina werkt alleen via de link in de herstel-e-mail. De link is mogelijk verlopen.</Alert>
          <Link href="/wachtwoord-vergeten" className="text-gold-700 underline">Vraag een nieuwe link aan</Link>
        </div>
      )}
    </>
  );
}
