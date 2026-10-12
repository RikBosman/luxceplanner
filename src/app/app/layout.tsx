import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { signOut } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mijn ontwerpen", robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Tweede controle naast de proxy: zonder geverifieerde gebruiker geen toegang.
  const { user } = await getCurrentUser();
  if (!user) redirect("/inloggen?volgende=/app");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-sand-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-[100rem] items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Logo href="/app" />
            <nav aria-label="Studio">
              <Link href="/app" className="rounded-full px-3 py-1.5 text-sm text-sand-700 hover:bg-sand-100">Mijn ontwerpen</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden rounded-full px-3 py-1.5 text-sm text-sand-600 hover:bg-sand-100 sm:inline-flex">Naar de website</Link>
            <details className="relative">
              <summary aria-label={`Accountmenu (${user.email ?? ""})`} className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-sand-300 px-3 py-1.5 text-sm [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-moss-600 text-xs font-semibold text-white uppercase">
                  {user.email?.[0] ?? "?"}
                </span>
                <span className="hidden max-w-48 truncate sm:inline">{user.email}</span>
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-sand-200 bg-white p-1.5 shadow-lg">
                <Link href="/app/account" className="block rounded-lg px-3 py-2 text-sm hover:bg-sand-100">Account en abonnement</Link>
                <Link href="/" className="block rounded-lg px-3 py-2 text-sm hover:bg-sand-100 sm:hidden">Naar de website</Link>
                <form action={signOut}>
                  <button type="submit" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-sand-100">Uitloggen</button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>
      <main id="inhoud" className="flex flex-1 flex-col bg-sand-50">{children}</main>
    </div>
  );
}
