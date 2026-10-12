import type { Metadata } from "next";
import { CtaBand, PageHero } from "@/components/marketing/sections";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Prijzen",
  description: "Begin gratis met tot 3 ontwerpen. Plus en Pro komen later met meer projecten, objecten en exportmogelijkheden.",
  alternates: { canonical: "/prijzen" },
};

// Let op: de limiet van het gratis plan staat ook in de database (tabel public.plans). Houd die gelijk.
const plans = [
  { name: "Gratis", price: "€ 0", note: "voor altijd", available: true, features: ["Tot 3 ontwerpen", "2D-plattegrond en 3D-weergave", "Basisbibliotheek met meubels", "Automatisch opslaan"] },
  { name: "Plus", price: "Nog niet beschikbaar", note: "prijs volgt", available: false, features: ["Tot 25 ontwerpen", "Extra meubels en materialen", "Export naar afbeelding en PDF", "Hogere exportkwaliteit"] },
  { name: "Pro", price: "Nog niet beschikbaar", note: "prijs volgt", available: false, features: ["Onbeperkt aantal ontwerpen", "Geavanceerde export", "Presentatiemogelijkheden voor klanten", "Later: samenwerken met klanten"] },
];

export default function PricingPage() {
  return (
    <>
      <PageHero eyebrow="Prijzen" title="Gratis beginnen, uitbreiden wanneer je wilt" intro="Je kunt nu gratis ontwerpen. Betaalde abonnementen zijn nog in voorbereiding en kunnen nog niet worden afgesloten." />
      <div className="container-page grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <section key={p.name} aria-labelledby={`plan-${p.name}`} className={`flex flex-col rounded-3xl border p-7 ${p.available ? "border-gold-400 bg-white shadow-sm" : "border-sand-200 bg-sand-100/50"}`}>
            <h2 id={`plan-${p.name}`} className="text-lg font-semibold text-sand-900">{p.name}</h2>
            <p className="mt-3 text-2xl font-semibold text-sand-900">{p.price}</p>
            <p className="text-sm text-sand-600">{p.note}</p>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-sand-700">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2"><span aria-hidden="true" className="text-gold-600">✓</span>{f}</li>
              ))}
            </ul>
            {p.available ? (
              <ButtonLink href="/registreren" className="mt-8">Gratis beginnen</ButtonLink>
            ) : (
              <p className="mt-8 rounded-full border border-dashed border-sand-300 px-4 py-2.5 text-center text-sm text-sand-600">Binnenkort</p>
            )}
          </section>
        ))}
      </div>
      <p className="container-page mt-6 text-sm text-sand-600">Alle genoemde prijzen zijn inclusief btw zodra ze bekend zijn. De inhoud van Plus en Pro kan nog veranderen.</p>
      <CtaBand />
    </>
  );
}
