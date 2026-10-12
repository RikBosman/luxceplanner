import type { Metadata } from "next";
import { CtaBand, PageHero } from "@/components/marketing/sections";
import { SampleRenderImage } from "@/components/plan/sample-render-image";
import { PlanSvg } from "@/components/plan/plan-svg";
import { SAMPLE_DESIGNS } from "@/domain/project";

export const metadata: Metadata = {
  title: "Hoe het werkt",
  description: "Zo ontwerp je je kamer: account aanmaken, kamer op maat tekenen, meubels plaatsen en het resultaat in 3D bekijken.",
  alternates: { canonical: "/hoe-het-werkt" },
};

const steps = [
  { title: "Maak een gratis account", text: "Registreer met je e-mailadres. Na bevestiging kom je in je eigen overzicht met ontwerpen." },
  { title: "Start een nieuw ontwerp", text: "Geef je ontwerp een naam en vul de breedte en lengte van je kamer in, bijvoorbeeld 4 bij 5 meter. De muren staan er meteen." },
  { title: "Pas de plattegrond aan", text: "Verschuif muren, typ exacte maten in en voeg deuren en ramen toe. Alles lijnt uit op een raster van 10 cm." },
  { title: "Richt de kamer in", text: "Kies meubels uit de bibliotheek en sleep ze naar hun plek. Draai ze met één klik of sneltoets." },
  { title: "Bekijk het in 3D", text: "Schakel naar 3D en draai om je kamer heen. Wijzigingen in 2D zie je direct terug." },
];

export default function HowItWorksPage() {
  const sample = SAMPLE_DESIGNS[1]!;
  const floor = sample.document.floors[0]!;
  return (
    <>
      <PageHero eyebrow="Hoe het werkt" title="Van lege kamer naar ingericht ontwerp" intro="Je hebt geen ervaring met tekenprogramma's nodig. Zo werkt het." />
      <div className="container-page grid gap-12 lg:grid-cols-[1fr_1fr]">
        <ol className="space-y-6">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-400 text-sm font-semibold text-ink-950">{i + 1}</span>
              <div>
                <h2 className="text-lg font-semibold text-sand-900">{s.title}</h2>
                <p className="mt-1 text-sand-700">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <figure className="space-y-3 rounded-3xl border border-sand-200 bg-white p-5">
          <PlanSvg floor={floor} materials={sample.document.materials} className="aspect-[4/3] w-full" title={`Plattegrond: ${sample.title}`} />
          <div className="overflow-hidden rounded-2xl"><SampleRenderImage sample={sample} className="aspect-[16/10]" /></div>
          <figcaption className="text-center text-xs text-sand-500">Voorbeeld: dezelfde slaapkamer als plattegrond en als fotorealistische 3D-render.</figcaption>
        </figure>
      </div>
      <CtaBand />
    </>
  );
}
