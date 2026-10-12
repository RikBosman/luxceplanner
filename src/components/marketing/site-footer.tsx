import Link from "next/link";
import { footerNav, siteConfig } from "@/config/site";
import { FullLogo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink-950 text-ivory">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-5">
          <FullLogo className="w-52" />
          <p className="max-w-xs text-sm leading-relaxed text-ivory/65">{siteConfig.tagline}</p>
        </div>
        {footerNav.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="font-display text-xs tracking-[0.2em] text-gold-400 uppercase">{group.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {group.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-ivory/70 transition-colors hover:text-gold-300">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container-page"><div className="gold-rule opacity-50" /></div>
      <div className="container-page flex flex-col gap-2 py-6 text-xs text-ivory/50 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {siteConfig.name}. Alle rechten voorbehouden.</p>
        <p>Deze website gebruikt geen tracking- of advertentiecookies.</p>
      </div>
    </footer>
  );
}
