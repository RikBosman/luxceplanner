import Link from "next/link";
import { footerNav, siteConfig } from "@/config/site";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-sand-200 bg-sand-100/60">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-sand-600">{siteConfig.tagline}</p>
        </div>
        {footerNav.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-sm font-semibold text-sand-900">{group.title}</h2>
            <ul className="mt-3 space-y-2">
              {group.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-sand-600 hover:text-sand-900">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container-page flex flex-col gap-2 border-t border-sand-200 py-6 text-xs text-sand-500 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {siteConfig.name}. Alle rechten voorbehouden.</p>
        <p>Deze website gebruikt geen tracking- of advertentiecookies.</p>
      </div>
    </footer>
  );
}
