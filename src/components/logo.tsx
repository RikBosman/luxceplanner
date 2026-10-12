import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold tracking-tight text-sand-900">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <rect x="3" y="3" width="26" height="26" rx="6" className="fill-moss-600" />
        <path d="M9 23V9h14v8h-6v6" fill="none" stroke="#fbf9f6" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <span className="text-lg">{siteConfig.name}</span>
    </Link>
  );
}
