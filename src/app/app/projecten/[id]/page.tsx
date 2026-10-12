import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Editor } from "@/components/editor/editor";
import { DeleteProjectForm } from "@/components/app/project-forms";
import { Alert } from "@/components/ui/form";
import { getMyProject } from "@/lib/projects/repository";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const project = await getMyProject((await params).id);
  return { title: project ? project.name : "Ontwerp" };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getMyProject(id);
  // Geen onderscheid tussen "bestaat niet" en "van iemand anders": beide geven 404.
  if (!project) notFound();

  if (!project.document) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-10">
        <Link href="/app" className="text-sm text-sand-600 hover:underline">← Mijn ontwerpen</Link>
        <h1 className="font-serif text-3xl text-sand-900">{project.name}</h1>
        <Alert>Dit ontwerp kon niet worden geopend: {project.loadError} Neem contact met ons op; we laten de gegevens ongemoeid zodat er niets verloren gaat.</Alert>
        <DeleteProjectForm id={project.id} name={project.name} backToDashboard />
      </div>
    );
  }

  return <Editor key={`${project.id}-${project.revision}`} projectId={project.id} projectName={project.name} initialRevision={project.revision} initialDocument={project.document} />;
}
