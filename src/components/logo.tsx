import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";

/** Splitst het woordmerk zoals in het logo: "Lucxe" in ivoor, "Planner" in goud. */
function splitWordmark(name: string): [string, string] {
  const m = name.match(/^(.*?)(planner)$/i);
  return m && m[1] ? [m[1], m[2]!] : [name, ""];
}

/**
 * Logo: het LP-monogram (uit het aangeleverde logo) met het woordmerk in Cinzel.
 * `tone="dark"` voor donkere achtergronden, `tone="light"` voor lichte (monogram op een inkttegel).
 */
export function Logo({ href = "/", tone = "dark", size = "md" }: { href?: string; tone?: "dark" | "light"; size?: "md" | "sm" }) {
  const [first, second] = splitWordmark(siteConfig.name);
  const mono = size === "sm" ? 30 : 36;
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label={`${siteConfig.name} — home`}>
      <span className={`inline-flex items-center justify-center rounded-md ${tone === "light" ? "bg-ink-950 p-1" : ""}`}>
        <Image src="/brand/monogram.png" alt="" width={Math.round(mono * 1.17)} height={mono} priority className="h-auto" style={{ width: Math.round(mono * 1.17) }} />
      </span>
      <span className={`font-display tracking-[0.18em] ${size === "sm" ? "text-[15px]" : "text-[17px]"} uppercase`}>
        <span className={tone === "dark" ? "text-ivory" : "text-ink-950"}>{first}</span>
        <span className={tone === "dark" ? "text-gold-400" : "text-gold-600"}>{second}</span>
      </span>
    </Link>
  );
}

/** Het volledige logo (monogram + woordmerk), voor donkere vlakken zoals de footer en de hero. */
export function FullLogo({ className = "" }: { className?: string }) {
  return <Image src="/brand/logo.png" alt={`${siteConfig.name} logo`} width={1166} height={661} className={`h-auto ${className}`} />;
}
