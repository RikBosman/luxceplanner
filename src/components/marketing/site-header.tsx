import Link from "next/link";
import { marketingNav } from "@/config/site";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-sand-200/80 bg-sand-50/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Hoofdmenu" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {marketingNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="rounded-full px-3 py-2 text-sm text-sand-700 hover:bg-sand-100 hover:text-sand-900">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/inloggen" variant="ghost">Inloggen</ButtonLink>
          <ButtonLink href="/registreren">Gratis beginnen</ButtonLink>
        </div>
        {/* Mobiel menu werkt ook zonder JavaScript dankzij <details>. */}
        <details className="group relative md:hidden">
          <summary className="flex cursor-pointer list-none items-center rounded-full border border-sand-300 bg-white px-4 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <nav aria-label="Mobiel menu" className="absolute right-0 mt-2 w-64 rounded-2xl border border-sand-200 bg-white p-2 shadow-lg">
            <ul>
              {marketingNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="block rounded-lg px-3 py-2 text-sand-800 hover:bg-sand-100">{item.label}</Link>
                </li>
              ))}
              <li><Link href="/contact" className="block rounded-lg px-3 py-2 text-sand-800 hover:bg-sand-100">Contact</Link></li>
              <li className="mt-2 grid gap-2 border-t border-sand-200 pt-3">
                <ButtonLink href="/inloggen" variant="secondary">Inloggen</ButtonLink>
                <ButtonLink href="/registreren">Gratis beginnen</ButtonLink>
              </li>
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
