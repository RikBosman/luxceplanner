import type { Metadata } from "next";
import Link from "next/link";
import { ResetRequestForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Wachtwoord vergeten", description: "Vraag een link aan om je wachtwoord opnieuw in te stellen.", alternates: { canonical: "/wachtwoord-vergeten" } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-serif text-3xl text-sand-900">Wachtwoord vergeten</h1>
      <p className="mt-2 text-sand-600">Vul je e-mailadres in. Je ontvangt een link om een nieuw wachtwoord in te stellen.</p>
      <div className="mt-6"><ResetRequestForm /></div>
      <p className="mt-6 text-center text-sm"><Link href="/inloggen" className="text-gold-700 underline-offset-4 hover:underline">Terug naar inloggen</Link></p>
    </>
  );
}
