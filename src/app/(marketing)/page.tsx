import Link from "next/link";
import { IsoSvg } from "@/components/plan/iso-svg";
import { PlanSvg } from "@/components/plan/plan-svg";
import { CtaBand, Eyebrow } from "@/components/marketing/sections";
import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { FAQ } from "@/content/faq";
import { SAMPLE_DESIGNS } from "@/domain/project";

const steps = [
  { title: "Teken je kamer", text: "Vul breedte en lengte in, of teken muren op het raster. Alles op echte maat, in millimeters nauwkeurig." },
  { title: "Richt hem in", text: "Sleep een bank, bed of eettafel naar binnen. Draai en verschuif tot het klopt — objecten lijnen vanzelf uit." },
  { title: "Bekijk het in 3D", text: "Met één klik zie je dezelfde kamer ruimtelijk. Draai eromheen en bekijk je ontwerp vanuit elke hoek." },
];

const benefits = [
  { title: "Direct aan de slag", text: "Geen handleiding nodig. Veelgebruikte acties staan altijd binnen handbereik." },
  { title: "Echte maten", text: "Typ \"4 m\" of \"400 cm\" — wat je invoert, klopt. Maatlijnen laten zien wat je tekent." },
  { title: "Eén ontwerp, twee weergaven", text: "2D en 3D gebruiken exact dezelfde gegevens. Wat je in 2D verplaatst, staat in 3D ook op die plek." },
  { title: "Veilig bewaard", text: "Je ontwerpen worden automatisch opgeslagen in je account en zijn alleen voor jou zichtbaar." },
];

export default function HomePage() {
  const hero = SAMPLE_DESIGNS[0]!;
  const floor = hero.document.floors[0]!;
  return (
    <>
      <section className="relative overflow-hidden bg-ink-950 text-ivory">
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-10 size-[560px] rounded-full bg-gold-400/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 size-[420px] rounded-full bg-gold-300/5 blur-3xl" />
        <div className="container-page relative grid items-center gap-14 pb-20 pt-16 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div>
            <Eyebrow tone="dark">Online interieurontwerp</Eyebrow>
            <h1 className="mt-6 font-serif text-5xl font-medium leading-[1.02] sm:text-7xl">
              Ontwerp je interieur <span className="text-gold-gradient italic">met allure.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-ivory/75">
              Met {siteConfig.name} teken je je kamer op echte maat, richt je hem in en bekijk je het resultaat in 3D. In je browser, zonder technische
              kennis.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/registreren" size="lg">Gratis beginnen</ButtonLink>
              <ButtonLink href="/hoe-het-werkt" size="lg" variant="outline-dark">Bekijk hoe het werkt</ButtonLink>
            </div>
            <p className="mt-5 text-sm text-ivory/55">Geen creditcard nodig · Gratis voor maximaal 3 ontwerpen</p>
            <p className="mt-8 max-w-xl border-l border-gold-400/50 pl-4 text-sm text-ivory/70">
              <strong className="font-medium text-ivory">Vroege versie.</strong> We bouwen de ontwerpstudio stap voor stap.{" "}
              <Link href="/functies" className="text-gold-300 underline underline-offset-4">Bekijk per functie wat al beschikbaar is</Link>.
            </p>
          </div>

          <figure className="relative">
            <div className="rounded-[28px] border border-gold-400/25 bg-ink-900/80 p-3 shadow-[0_40px_120px_-40px_rgba(207,163,74,0.35)]">
              <div className="overflow-hidden rounded-[20px] bg-sand-100">
                <IsoSvg floor={floor} materials={hero.document.materials} className="aspect-[4/3] w-full" title={`3D-voorvertoning: ${hero.title}`} />
              </div>
              <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-4 rounded-[18px] bg-ink-950 p-3">
                <div className="flex items-center gap-3">
                  <div className="w-28 shrink-0 rounded-lg bg-sand-50 p-1.5">
                    <PlanSvg floor={floor} materials={hero.document.materials} className="aspect-[4/3] w-full" title={`Plattegrond: ${hero.title}`} />
                  </div>
                  <div>
                    <p className="font-display text-[11px] tracking-[0.22em] text-gold-400 uppercase">2D ↔ 3D</p>
                    <p className="mt-1 text-sm text-ivory/80">{hero.title}</p>
                  </div>
                </div>
                <p className="text-right text-xs text-ivory/50">Eén ontwerp,<br />twee weergaven</p>
              </div>
            </div>
            <figcaption className="mt-4 text-center text-xs text-ivory/45">
              Voorbeeldontwerp: beide weergaven worden berekend uit één en hetzelfde projectbestand.
            </figcaption>
          </figure>
        </div>
        <div className="gold-rule" />
      </section>

      <section aria-labelledby="stappen" className="bg-sand-50 py-24">
        <div className="container-page">
          <h2 id="stappen" className="font-serif text-4xl font-medium text-ink-950 sm:text-5xl">In drie stappen van idee naar ontwerp</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-sand-200 bg-white p-7 shadow-[0_20px_50px_-35px_rgba(13,11,10,0.35)]">
                <span className="font-display text-3xl text-gold-500">0{i + 1}</span>
                <h3 className="mt-3 font-serif text-2xl font-medium text-ink-950">{s.title}</h3>
                <p className="mt-2 text-sand-700">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="voordelen" className="container-page py-24">
        <h2 id="voordelen" className="font-serif text-4xl font-medium text-ink-950 sm:text-5xl">Gemaakt voor gebruiksgemak</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title}>
              <div className="h-px w-12 bg-gold-400" aria-hidden="true" />
              <h3 className="mt-4 font-serif text-xl font-medium text-ink-950">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-sand-700">{b.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-8"><Link href="/functies" className="font-medium text-gold-700 underline-offset-4 hover:underline">Alle functies bekijken →</Link></p>
      </section>

      <section aria-labelledby="voorbeelden" className="bg-ink-950 py-24 text-ivory">
        <div className="container-page">
          <Eyebrow tone="dark">Inspiratie</Eyebrow>
          <h2 id="voorbeelden" className="mt-4 font-serif text-4xl font-medium sm:text-5xl">Voorbeeldontwerpen</h2>
          <p className="mt-3 max-w-2xl text-ivory/70">Ter inspiratie: drie kamers die met dezelfde bouwstenen zijn gemaakt als waarmee jij ontwerpt.</p>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {SAMPLE_DESIGNS.map((d) => (
              <li key={d.slug} className="overflow-hidden rounded-2xl border border-gold-400/20 bg-ink-900">
                <IsoSvg floor={d.document.floors[0]!} materials={d.document.materials} className="aspect-[4/3] w-full bg-sand-100" title={d.title} />
                <div className="p-5">
                  <h3 className="font-serif text-xl font-medium text-ivory">{d.title}</h3>
                  <p className="mt-1 text-sm text-ivory/60">{d.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-10"><Link href="/inspiratie" className="font-medium text-gold-300 underline-offset-4 hover:underline">Meer inspiratie →</Link></p>
        </div>
      </section>

      <section aria-labelledby="prijzen" className="container-page py-24">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="prijzen" className="font-serif text-4xl font-medium text-ink-950 sm:text-5xl">Gratis beginnen, later uitbreiden</h2>
            <p className="mt-4 text-sand-700">
              Met het gratis plan ontwerp je tot 3 kamers of woningen in 2D en 3D. Later komen Plus en Pro met meer
              projecten, extra objecten en exportmogelijkheden. Betaalde abonnementen zijn nog niet beschikbaar.
            </p>
            <p className="mt-6"><Link href="/prijzen" className="font-medium text-gold-700 underline-offset-4 hover:underline">Plannen vergelijken →</Link></p>
          </div>
          <div aria-labelledby="faq-kort">
            <h2 id="faq-kort" className="text-lg font-semibold text-sand-900">Veelgestelde vragen</h2>
            <div className="mt-4 divide-y divide-sand-200 rounded-2xl border border-sand-200 bg-white">
              {FAQ.slice(0, 4).map((f) => (
                <details key={f.q} className="group p-5">
                  <summary className="cursor-pointer list-none font-medium text-sand-900 [&::-webkit-details-marker]:hidden">
                    <span className="mr-2 inline-block text-gold-600 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                    {f.q}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-sand-700">{f.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-4 text-sm"><Link href="/veelgestelde-vragen" className="text-gold-700 underline-offset-4 hover:underline">Alle vragen →</Link></p>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
