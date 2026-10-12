import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/jost";
import "@fontsource/cinzel/500.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — Ontwerp je woning in 2D en 3D`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: { type: "website", locale: siteConfig.locale, siteName: siteConfig.name },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#0d0b0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-dvh">
        <a
          href="#inhoud"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:text-ink-950 focus:px-4 focus:py-2 focus:shadow"
        >
          Naar de inhoud
        </a>
        {children}
      </body>
    </html>
  );
}
