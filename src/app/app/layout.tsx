import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { signOut } from "@/lib/auth/actions";
import { isLocalMode } from "@/lib/mode";
import { localDataFile } from "@/lib/projects/local-store";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Mijn ontwerpen", robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Tweede controle naast de proxy: zonder geverifieerde gebruiker geen toegang.
  const user = await getSessionUser();
  if (!user) redirect("/inloggen?volgende=/app");
  const local = isLocalMode();

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b border-gold-400/15 bg-ink-950 text-ivory">
        <div className="mx-auto flex h-14 w-full max-w-[100rem] items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Logo href="/app" size="sm" />
            <nav aria-label="Studio">
              <Link href="/app" className="rounded-full px-3 py-1.5 text-sm text-ivory/80 hover:bg-white/5 hover:text-gold-300">Mijn ontwerpen</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden rounded-full px-3 py-1.5 text-sm text-ivory/65 hover:bg-white/5 hover:text-gold-300 sm:inline-flex">Naar de website</Link>
            <details className="relative">
              <summary aria-label={`Accountmenu (${user.email ?? ""})`} className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-gold-400/40 px-3 py-1.5 text-sm [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-gold-400 text-xs font-semibold text-ink-950 uppercase">
                  {user.email?.[0] ?? "?"}
                </span>
                <span className="hidden max-w-48 truncate sm:inline">{user.email}</span>
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-sand-200 bg-white p-1.5 text-ink-950 shadow-lg">
                <Link href="/app/account" className="block rounded-lg px-3 py-2 text-sm hover:bg-sand-100">Account en abonnement</Link>
                <Link href="/" className="block rounded-lg px-3 py-2 text-sm hover:bg-sand-100 sm:hidden">Naar de website</Link>
                {!local && (
                  <form action={signOut}>
                    <button type="submit" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-sand-100">Uitloggen</button>
                  </form>
                )}
              </div>
            </details>
          </div>
        </div>
      </header>
      {local && (
        <p className="border-b border-gold-200 bg-gold-50 px-4 py-1.5 text-center text-xs text-gold-800">
          Lokale modus — geen account nodig. Ontwerpen worden opgeslagen op deze computer in <code className="font-mono">{localDataFile()}</code>.
        </p>
      )}
      <main id="inhoud" className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-sand-50">{children}</main>
    </div>
  );
}
