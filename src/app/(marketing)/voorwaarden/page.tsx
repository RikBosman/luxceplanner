import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/sections";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Gebruiksvoorwaarden",
  description: `De voorwaarden voor het gebruik van ${siteConfig.name}.`,
  alternates: { canonical: "/voorwaarden" },
};

const sections: { title: string; text: string }[] = [
  { title: "1. Toepasselijkheid", text: `Deze voorwaarden gelden voor het gebruik van de website en ontwerpstudio van ${siteConfig.name}. Door een account aan te maken ga je ermee akkoord.` },
  { title: "2. Account", text: "Je bent verantwoordelijk voor het geheimhouden van je wachtwoord en voor wat er met je account gebeurt. Je geeft een geldig e-mailadres op. Je moet 16 jaar of ouder zijn, of toestemming hebben van een ouder of voogd." },
  { title: "3. Gebruik van de dienst", text: "Je gebruikt de dienst op een normale, rechtmatige manier. Het is niet toegestaan de dienst te overbelasten, beveiligingen te omzeilen of toegang te proberen te krijgen tot gegevens van anderen." },
  { title: "4. Jouw ontwerpen", text: "Ontwerpen die je maakt blijven van jou. Je geeft ons alleen toestemming om ze op te slaan en te tonen voor zover dat nodig is om de dienst te leveren." },
  { title: "5. Maten en advies", text: "De ontwerpstudio is een hulpmiddel om ideeën te visualiseren. Controleer maten altijd zelf voordat je iets koopt of laat bouwen. Een ontwerp is geen bouwtekening en vervangt geen professioneel advies." },
  { title: "6. Beschikbaarheid", text: "We doen ons best de dienst goed beschikbaar te houden en je gegevens zorgvuldig te bewaren, maar kunnen geen ononderbroken beschikbaarheid garanderen. De dienst is in ontwikkeling; functies kunnen veranderen." },
  { title: "7. Betaalde abonnementen", text: "Betaalde abonnementen zijn nog niet beschikbaar. Zodra ze worden aangeboden, gelden aanvullende voorwaarden over prijs, looptijd, opzegging en herroepingsrecht." },
  { title: "8. Aansprakelijkheid", text: "[Concept: beperking van aansprakelijkheid laten opstellen door een jurist, binnen de grenzen van het consumentenrecht.]" },
  { title: "9. Beëindiging", text: "Je kunt je account op ieder moment zelf verwijderen. Bij ernstig misbruik kunnen wij een account blokkeren." },
  { title: "10. Toepasselijk recht", text: "Op deze voorwaarden is Nederlands recht van toepassing." },
];

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Juridisch" title="Gebruiksvoorwaarden" />
      <article className="container-page max-w-3xl space-y-6 text-sand-800">
        <p className="rounded-lg border border-clay-500/40 bg-clay-500/10 p-4 text-sm text-clay-600">
          <strong>Concept.</strong> Deze voorwaarden zijn een eerste opzet en moeten vóór de commerciële lancering juridisch worden gecontroleerd.
        </p>
        {sections.map((s) => (
          <section key={s.title} className="space-y-2">
            <h2 className="font-serif text-xl text-sand-900">{s.title}</h2>
            <p className="leading-relaxed">{s.text}</p>
          </section>
        ))}
      </article>
    </>
  );
}
