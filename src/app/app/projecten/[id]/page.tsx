import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IsoSvg } from "@/components/plan/iso-svg";
import { PlanSvg } from "@/components/plan/plan-svg";
import { Alert } from "@/components/ui/form";
import { getMyProject } from "@/lib/projects/repository";

export const metadata: Metadata = { title: "Ontwerp" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getMyProject(id);
  // Geen onderscheid tussen "bestaat niet" en "van iemand anders": beide geven 404.
  if (!project) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <p><Link href="/app" className="text-sm text-sand-600 hover:underline">← Mijn ontwerpen</Link></p>
      <h1 className="mt-2 font-serif text-3xl text-sand-900">{project.name}</h1>
      {project.loadError || !project.document ? (
        <div className="mt-6"><Alert>Dit ontwerp kon niet worden geopend: {project.loadError}</Alert></div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <PlanSvg floor={project.document.floors[0]!} materials={project.document.materials} className="aspect-[4/3] w-full rounded-2xl border border-sand-200 bg-white p-4" />
          <IsoSvg floor={project.document.floors[0]!} materials={project.document.materials} className="aspect-[4/3] w-full rounded-2xl border border-sand-200 bg-white p-4" />
        </div>
      )}
    </div>
  );
}
