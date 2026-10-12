import Link from "next/link";
import { IsoSvg } from "@/components/plan/iso-svg";
import { PlanSvg } from "@/components/plan/plan-svg";
import { CtaBand } from "@/components/marketing/sections";
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
      <section className="container-page grid items-center gap-12 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-moss-600">Online interieurontwerp</p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.1] text-sand-900 sm:text-6xl">
            Teken je kamer, richt hem in en bekijk hem in 3D.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-sand-700">
            {siteConfig.name} is de eenvoudige manier om je woning te ontwerpen. Op echte maat, in je browser, zonder
            technische kennis.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/registreren" size="lg">Gratis beginnen</ButtonLink>
            <ButtonLink href="/hoe-het-werkt" size="lg" variant="secondary">Bekijk hoe het werkt</ButtonLink>
          </div>
          <p className="mt-4 text-sm text-sand-600">Geen creditcard nodig. Gratis voor maximaal 3 ontwerpen.</p>
          <p className="mt-6 max-w-xl rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm text-sand-700">
            <strong className="font-semibold text-sand-900">Vroege versie.</strong> We bouwen de ontwerpstudio stap voor stap.{" "}
            <Link href="/functies" className="text-moss-700 underline underline-offset-4">Bekijk per functie wat al beschikbaar is</Link>.
          </p>
        </div>

        <figure className="relative">
          <div className="grid grid-cols-2 gap-3 rounded-3xl border border-sand-200 bg-white p-4 shadow-[0_20px_60px_-30px_rgba(63,55,46,0.35)]">
            <div className="rounded-2xl bg-sand-50 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-sand-500">2D-plattegrond</p>
              <PlanSvg floor={floor} materials={hero.document.materials} className="aspect-square w-full" title={`Plattegrond: ${hero.title}`} />
            </div>
            <div className="rounded-2xl bg-sand-50 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-sand-500">3D-weergave</p>
              <IsoSvg floor={floor} materials={hero.document.materials} className="aspect-square w-full" title={`3D-voorvertoning: ${hero.title}`} />
            </div>
          </div>
          <figcaption className="mt-3 text-center text-xs text-sand-500">
            Voorbeeldontwerp: beide weergaven worden berekend uit één en hetzelfde projectbestand.
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="stappen" className="border-y border-sand-200 bg-white py-20">
        <div className="container-page">
          <h2 id="stappen" className="font-serif text-3xl text-sand-900 sm:text-4xl">In drie stappen van idee naar ontwerp</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-sand-200 bg-sand-50 p-6">
                <span className="flex size-9 items-center justify-center rounded-full bg-moss-600 text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold text-sand-900">{s.title}</h3>
                <p className="mt-2 text-sand-700">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="voordelen" className="container-page py-20">
        <h2 id="voordelen" className="font-serif text-3xl text-sand-900 sm:text-4xl">Gemaakt voor gebruiksgemak</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title}>
              <div className="h-1 w-10 rounded bg-moss-400" aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-sand-900">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-sand-700">{b.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-8"><Link href="/functies" className="font-medium text-moss-700 underline-offset-4 hover:underline">Alle functies bekijken →</Link></p>
      </section>

      <section aria-labelledby="voorbeelden" className="bg-sand-100/70 py-20">
        <div className="container-page">
          <h2 id="voorbeelden" className="font-serif text-3xl text-sand-900 sm:text-4xl">Voorbeeldontwerpen</h2>
          <p className="mt-3 max-w-2xl text-sand-700">Ter inspiratie: drie kamers die met dezelfde bouwstenen zijn gemaakt als waarmee jij ontwerpt.</p>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {SAMPLE_DESIGNS.map((d) => (
              <li key={d.slug} className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
                <IsoSvg floor={d.document.floors[0]!} materials={d.document.materials} className="aspect-[4/3] w-full bg-sand-50 p-4" title={d.title} />
                <div className="p-5">
                  <h3 className="font-semibold text-sand-900">{d.title}</h3>
                  <p className="mt-1 text-sm text-sand-600">{d.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8"><Link href="/inspiratie" className="font-medium text-moss-700 underline-offset-4 hover:underline">Meer inspiratie →</Link></p>
        </div>
      </section>

      <section aria-labelledby="prijzen" className="container-page py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="prijzen" className="font-serif text-3xl text-sand-900 sm:text-4xl">Gratis beginnen, later uitbreiden</h2>
            <p className="mt-4 text-sand-700">
              Met het gratis plan ontwerp je tot 3 kamers of woningen in 2D en 3D. Later komen Plus en Pro met meer
              projecten, extra objecten en exportmogelijkheden. Betaalde abonnementen zijn nog niet beschikbaar.
            </p>
            <p className="mt-6"><Link href="/prijzen" className="font-medium text-moss-700 underline-offset-4 hover:underline">Plannen vergelijken →</Link></p>
          </div>
          <div aria-labelledby="faq-kort">
            <h2 id="faq-kort" className="text-lg font-semibold text-sand-900">Veelgestelde vragen</h2>
            <div className="mt-4 divide-y divide-sand-200 rounded-2xl border border-sand-200 bg-white">
              {FAQ.slice(0, 4).map((f) => (
                <details key={f.q} className="group p-5">
                  <summary className="cursor-pointer list-none font-medium text-sand-900 [&::-webkit-details-marker]:hidden">
                    <span className="mr-2 inline-block text-moss-600 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                    {f.q}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-sand-700">{f.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-4 text-sm"><Link href="/veelgestelde-vragen" className="text-moss-700 underline-offset-4 hover:underline">Alle vragen →</Link></p>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
