import Link from "next/link";
import { marketingNav } from "@/config/site";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gold-400/15 bg-ink-950/95 backdrop-blur">
      <div className="container-page flex h-[72px] items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Hoofdmenu" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {marketingNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="rounded-full px-3 py-2 text-sm tracking-wide text-ivory/75 transition-colors hover:text-gold-300">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <ButtonLink href="/inloggen" variant="ghost-dark">Inloggen</ButtonLink>
          <ButtonLink href="/registreren">Gratis beginnen</ButtonLink>
        </div>
        {/* Mobiel menu werkt ook zonder JavaScript dankzij <details>. */}
        <details className="group relative lg:hidden">
          <summary className="flex cursor-pointer list-none items-center rounded-full border border-gold-400/50 px-4 py-2 text-sm font-medium text-ivory [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <nav aria-label="Mobiel menu" className="absolute right-0 mt-3 w-64 rounded-2xl border border-gold-400/20 bg-ink-900 p-2 shadow-2xl">
            <ul>
              {marketingNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="block rounded-lg px-3 py-2 text-ivory/85 hover:bg-white/5 hover:text-gold-300">{item.label}</Link>
                </li>
              ))}
              <li><Link href="/contact" className="block rounded-lg px-3 py-2 text-ivory/85 hover:bg-white/5 hover:text-gold-300">Contact</Link></li>
              <li className="mt-2 grid gap-2 border-t border-gold-400/20 pt-3">
                <ButtonLink href="/inloggen" variant="outline-dark">Inloggen</ButtonLink>
                <ButtonLink href="/registreren">Gratis beginnen</ButtonLink>
              </li>
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
