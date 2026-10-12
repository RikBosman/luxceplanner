import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/auth/auth-forms";
import { Alert } from "@/components/ui/form";

export const metadata: Metadata = { title: "Inloggen", description: "Log in op je account om verder te gaan met je ontwerpen.", alternates: { canonical: "/inloggen" } };

const notices: Record<string, { tone: "info" | "error" | "success"; text: string }> = {
  "link-ongeldig": { tone: "error", text: "Deze link is ongeldig of verlopen. Log in of vraag een nieuwe link aan." },
  uitgelogd: { tone: "success", text: "Je bent uitgelogd." },
  "account-verwijderd": { tone: "success", text: "Je account en ontwerpen zijn verwijderd." },
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.volgende === "string" ? sp.volgende : undefined;
  const notice = typeof sp.melding === "string" ? notices[sp.melding] : undefined;
  return (
    <>
      <h1 className="font-serif text-3xl text-sand-900">Inloggen</h1>
      <p className="mt-2 text-sand-600">Welkom terug. Log in om verder te gaan met je ontwerpen.</p>
      <div className="mt-6 space-y-5">
        {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
        <SignInForm next={next} />
      </div>
      <p className="mt-6 text-center text-sm text-sand-600">
        Nog geen account? <Link href="/registreren" className="font-medium text-gold-700 underline-offset-4 hover:underline">Gratis registreren</Link>
      </p>
    </>
  );
}
