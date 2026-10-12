import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/sections";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacyverklaring",
  description: `Hoe ${siteConfig.name} omgaat met je persoonsgegevens.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Juridisch" title="Privacyverklaring" />
      <article className="container-page max-w-3xl space-y-6 text-sand-800">
        <p className="rounded-lg border border-clay-500/40 bg-clay-500/10 p-4 text-sm text-clay-600">
          <strong>Concept.</strong> Deze tekst is een eerste opzet en moet vóór de commerciële lancering door een jurist worden gecontroleerd en
          aangevuld met de gegevens van de verwerkingsverantwoordelijke (bedrijfsnaam, KvK-nummer, adres).
        </p>
        <Section title="Wie zijn wij">
          <p>{siteConfig.name} biedt een online ontwerpstudio waarmee je plattegronden en interieurs in 2D en 3D kunt maken. Contact: {siteConfig.contactEmail}.</p>
        </Section>
        <Section title="Welke gegevens we verwerken">
          <ul className="list-disc space-y-1 pl-6">
            <li>Je e-mailadres en een versleuteld wachtwoord (via onze authenticatiedienst), om je account te beheren.</li>
            <li>Je ontwerpen: namen van projecten en de plattegronden, meubels en instellingen die je maakt.</li>
            <li>Technische gegevens die nodig zijn voor beveiliging, zoals tijdstip van inloggen en foutmeldingen, zonder de inhoud van je ontwerpen.</li>
          </ul>
          <p>We vragen niet om je naam, adres of telefoonnummer en verkopen geen gegevens.</p>
        </Section>
        <Section title="Waarom we dat doen (grondslag)">
          <p>We verwerken deze gegevens om de overeenkomst met jou uit te voeren: je account en ontwerpen beschikbaar stellen (art. 6 lid 1 sub b AVG), en vanwege ons gerechtvaardigd belang bij een veilige dienst (art. 6 lid 1 sub f AVG).</p>
        </Section>
        <Section title="Cookies">
          <p>We gebruiken alleen functionele cookies die nodig zijn om je ingelogd te houden. We gebruiken geen tracking- of advertentiecookies. Daarom vragen we geen toestemming voor cookies. Als we in de toekomst analytics toevoegen, kiezen we een privacyvriendelijke oplossing en vragen we toestemming waar dat vereist is.</p>
        </Section>
        <Section title="Met wie we gegevens delen">
          <p>We gebruiken Supabase voor database en authenticatie en een hostingpartij voor de website. Met deze verwerkers sluiten we verwerkersovereenkomsten. We kiezen waar mogelijk voor opslag binnen de Europese Unie. [Concept: definitieve verwerkers en locaties invullen.]</p>
        </Section>
        <Section title="Hoe lang we gegevens bewaren">
          <p>Zolang je account bestaat. Verwijder je je account, dan verwijderen we je account en al je ontwerpen direct uit de database. Back-ups worden na maximaal [concept: termijn invullen] dagen overschreven.</p>
        </Section>
        <Section title="Je rechten">
          <p>Je hebt recht op inzage, correctie, verwijdering, beperking, overdraagbaarheid en bezwaar. Je account en ontwerpen kun je zelf verwijderen via je accountinstellingen. Voor andere verzoeken mail je naar {siteConfig.contactEmail}. Je kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens.</p>
        </Section>
        <Section title="Beveiliging">
          <p>Verbindingen zijn versleuteld. Ontwerpen zijn per gebruiker afgeschermd; dit wordt op databaseniveau afgedwongen. Wachtwoorden slaan we niet zelf op.</p>
        </Section>
      </article>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-serif text-2xl text-sand-900">{title}</h2>
      <div className="space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}
