/**
 * Centrale merk- en siteconfiguratie. De merknaam is voorlopig "Ruimte" en via NEXT_PUBLIC_BRAND_NAME te wijzigen.
 * Controleer vóór de commerciële lancering de beschikbaarheid van merknaam en domein.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "Ruimte",
  tagline: "Teken je kamer, richt hem in en bekijk je ontwerp in 3D — eenvoudig, intuïtief en op jouw manier.",
  description:
    "Ontwerp je woning online in 2D en 3D. Teken kamers op echte maat, plaats meubels en bekijk het resultaat direct ruimtelijk. Gratis beginnen, geen installatie nodig.",
  url: (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "info@example.com",
  locale: "nl_NL",
} as const;

export const marketingNav = [
  { href: "/functies", label: "Functies" },
  { href: "/hoe-het-werkt", label: "Hoe het werkt" },
  { href: "/inspiratie", label: "Inspiratie" },
  { href: "/prijzen", label: "Prijzen" },
  { href: "/veelgestelde-vragen", label: "Vragen" },
] as const;

export const footerNav = [
  {
    title: "Product",
    links: [
      { href: "/functies", label: "Functies" },
      { href: "/hoe-het-werkt", label: "Hoe het werkt" },
      { href: "/inspiratie", label: "Inspiratie" },
      { href: "/prijzen", label: "Prijzen" },
    ],
  },
  {
    title: "Hulp",
    links: [
      { href: "/veelgestelde-vragen", label: "Veelgestelde vragen" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Juridisch",
    links: [
      { href: "/privacy", label: "Privacyverklaring" },
      { href: "/voorwaarden", label: "Gebruiksvoorwaarden" },
    ],
  },
] as const;
