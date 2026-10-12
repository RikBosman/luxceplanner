import Link from "next/link";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/ui/form";
import { getSupabaseEnv, SUPABASE_NOT_CONFIGURED } from "@/lib/supabase/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const configured = getSupabaseEnv() !== null;
  return (
    <div className="flex min-h-dvh flex-col bg-sand-100/60">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <Link href="/" className="text-sm text-sand-600 hover:text-sand-900">← Terug naar de website</Link>
      </header>
      <main id="inhoud" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-md space-y-4">
          {!configured && <Alert tone="info">{SUPABASE_NOT_CONFIGURED}</Alert>}
          <div className="rounded-3xl border border-sand-200 bg-white p-8 shadow-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
