import type { Metadata } from "next";
import { CtaBand, PageHero, StatusBadge } from "@/components/marketing/sections";
import { FEATURE_GROUPS } from "@/content/features";

export const metadata: Metadata = {
  title: "Functies",
  description: "Wat je met de ontwerpstudio kunt: kamers op echte maat tekenen, meubels plaatsen en je ontwerp in 3D bekijken. Met een eerlijke status per functie.",
  alternates: { canonical: "/functies" },
};

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Functies"
        title="Alles wat je nodig hebt om je ruimte te ontwerpen"
        intro="We bouwen stap voor stap. Hieronder zie je per functie of die al beschikbaar is, in ontwikkeling is of gepland staat."
      />
      <div className="container-page space-y-14">
        {FEATURE_GROUPS.map((group) => (
          <section key={group.title} aria-labelledby={`groep-${group.title}`}>
            <h2 id={`groep-${group.title}`} className="font-serif text-2xl text-sand-900">{group.title}</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {group.items.map((f) => (
                <li key={f.name} className="rounded-2xl border border-sand-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-sand-900">{f.name}</h3>
                    <StatusBadge status={f.status} />
                  </div>
                  <p className="mt-2 text-sm text-sand-700">{f.text}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <CtaBand />
    </>
  );
}
