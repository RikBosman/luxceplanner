import Link from "next/link";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import { isLocalMode } from "@/lib/mode";
import { getSupabaseEnv, SUPABASE_NOT_CONFIGURED } from "@/lib/supabase/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const local = isLocalMode();
  const configured = local || getSupabaseEnv() !== null;
  return (
    <div className="flex min-h-dvh flex-col bg-sand-100/60">
      <header className="border-b border-gold-400/15 bg-ink-950">
        <div className="container-page flex h-[72px] items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-ivory/70 hover:text-gold-300">← Terug naar de website</Link>
        </div>
      </header>
      <main id="inhoud" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-md space-y-4">
          {!configured && <Alert tone="info">{SUPABASE_NOT_CONFIGURED}</Alert>}
          <div className="rounded-3xl border border-sand-200 bg-white p-8 shadow-[0_30px_80px_-40px_rgba(13,11,10,0.35)]">
            {local ? (
              <div className="space-y-4">
                <h1 className="font-serif text-3xl text-sand-900">Lokale modus</h1>
                <p className="text-sand-700">De app draait op je eigen computer zonder accounts. Je hoeft niet te registreren of in te loggen; je ontwerpen worden lokaal opgeslagen.</p>
                <ButtonLink href="/app" className="w-full">Naar de ontwerpstudio</ButtonLink>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
