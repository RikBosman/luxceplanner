import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/sections";
import { MODEL_CREDITS } from "@/domain/project";

export const metadata: Metadata = {
  title: "Licenties en naamsvermelding",
  description: "Herkomst en licenties van de 3D-modellen, lettertypen en open-sourcesoftware die we gebruiken.",
  alternates: { canonical: "/licenties" },
};

const LICENSE_LINKS: Record<string, string> = {
  "CC0-1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
};

const software = [
  ["Next.js, React", "MIT"],
  ["Three.js, React Three Fiber", "MIT"],
  ["three-gpu-pathtracer, three-mesh-bvh (fotorealistisch renderen)", "MIT"],
  ["Supabase-clientbibliotheken", "MIT"],
  ["Zod", "MIT"],
  ["Tailwind CSS", "MIT"],
  ["Cormorant Garamond, Cinzel, Jost (via Fontsource)", "SIL Open Font License 1.1"],
];

export default function LicensesPage() {
  return (
    <>
      <PageHero eyebrow="Juridisch" title="Licenties en naamsvermelding" intro="We gebruiken alleen materiaal dat we mogen gebruiken. Hieronder staat waar het vandaan komt." />
      <div className="container-page max-w-3xl space-y-10 text-sand-800">
        <section>
          <h2 className="font-serif text-2xl text-ink-950">3D-modellen</h2>
          <p className="mt-2 text-sm">De realistische meubelmodellen komen uit de officiële glTF-voorbeeldcollectie van de Khronos Group. De overige meubels zijn door ons zelf gemodelleerd.</p>
          <ul className="mt-4 space-y-3">
            {Object.values(MODEL_CREDITS).map((m) => (
              <li key={m.url} className="rounded-xl border border-sand-200 bg-white p-4 text-sm">
                <p className="font-medium text-ink-950">{m.credit}</p>
                <p className="mt-1 text-sand-600">
                  Licentie: <a href={LICENSE_LINKS[m.license]} className="text-gold-700 underline" rel="noopener">{m.license}</a> · Bron: KhronosGroup/glTF-Sample-Assets · Aangepast: opgeschoond en texturen verkleind.
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-ink-950">Software en lettertypen</h2>
          <ul className="mt-4 divide-y divide-sand-200 rounded-xl border border-sand-200 bg-white text-sm">
            {software.map(([name, license]) => (
              <li key={name} className="flex justify-between gap-4 p-3">
                <span>{name}</span>
                <span className="text-sand-600">{license}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
