import type { Metadata } from "next";
import { CtaBand, PageHero } from "@/components/marketing/sections";
import { SampleRenderImage } from "@/components/plan/sample-render-image";
import { PlanSvg } from "@/components/plan/plan-svg";
import { formatArea, polygonArea, SAMPLE_DESIGNS } from "@/domain/project";

export const metadata: Metadata = {
  title: "Inspiratie",
  description: "Voorbeeldontwerpen van een woonkamer, slaapkamer en keuken, als plattegrond en in 3D.",
  alternates: { canonical: "/inspiratie" },
};

export default function InspirationPage() {
  return (
    <>
      <PageHero eyebrow="Inspiratie" title="Voorbeeldontwerpen" intro="Deze voorbeelden zijn gemaakt met dezelfde bouwstenen en maten als in de ontwerpstudio." />
      <div className="container-page space-y-10">
        {SAMPLE_DESIGNS.map((d) => {
          const floor = d.document.floors[0]!;
          const area = floor.rooms.reduce((s, r) => s + polygonArea(r.polygon), 0);
          return (
            <article key={d.slug} className="grid gap-6 rounded-3xl border border-sand-200 bg-white p-6 lg:grid-cols-[1fr_1fr_0.8fr]">
              <PlanSvg floor={floor} materials={d.document.materials} className="aspect-[4/3] w-full rounded-2xl bg-sand-50 p-3" title={`Plattegrond: ${d.title}`} />
              <div className="overflow-hidden rounded-2xl"><SampleRenderImage sample={d} className="aspect-[16/10]" /></div>
              <div>
                <h2 className="font-serif text-2xl text-sand-900">{d.title}</h2>
                <p className="mt-2 text-sand-700">{d.description}</p>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-sand-600">Oppervlakte</dt><dd className="text-sand-900">{formatArea(area)}</dd>
                  <dt className="text-sand-600">Meubels</dt><dd className="text-sand-900">{floor.furniture.length}</dd>
                  <dt className="text-sand-600">Deuren en ramen</dt><dd className="text-sand-900">{floor.openings.length}</dd>
                </dl>
              </div>
            </article>
          );
        })}
      </div>
      <CtaBand title="Maak je eigen ontwerp" />
    </>
  );
}
