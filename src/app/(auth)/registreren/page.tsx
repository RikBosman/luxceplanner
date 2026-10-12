import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Gratis account aanmaken", description: "Maak gratis een account aan en ontwerp je kamer in 2D en 3D.", alternates: { canonical: "/registreren" } };

export default function SignUpPage() {
  return (
    <>
      <h1 className="font-serif text-3xl text-sand-900">Gratis beginnen</h1>
      <p className="mt-2 text-sand-600">Maak een account aan. We vragen alleen je e-mailadres.</p>
      <div className="mt-6"><SignUpForm /></div>
      <p className="mt-6 text-center text-sm text-sand-600">
        Heb je al een account? <Link href="/inloggen" className="font-medium text-moss-700 underline-offset-4 hover:underline">Inloggen</Link>
      </p>
    </>
  );
}
