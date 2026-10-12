import Link from "next/link";
import { DeleteProjectForm, DuplicateProjectForm, NewProjectForm, RenameProjectForm } from "@/components/app/project-forms";
import { PlanSvg } from "@/components/plan/plan-svg";
import { Alert } from "@/components/ui/form";
import { getMyPlan, listMyProjects } from "@/lib/projects/repository";

const dateFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" });

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ projects, error }, plan, sp] = await Promise.all([listMyProjects(), getMyPlan(), searchParams]);
  const atLimit = plan?.maxProjects != null && plan.projectCount >= plan.maxProjects;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-sand-900">Welkom in je ontwerpstudio</h1>
          <p className="mt-1 text-sand-600">
            {plan
              ? `${plan.planName} plan · ${plan.projectCount}${plan.maxProjects != null ? ` van ${plan.maxProjects}` : ""} ${plan.projectCount === 1 && plan.maxProjects == null ? "ontwerp" : "ontwerpen"}`
              : "Je ontwerpen"}
          </p>
        </div>
        <a href="#nieuw-ontwerp" className="inline-flex items-center rounded-full bg-gold-400 px-5 py-2.5 text-sm font-medium text-ink-950 hover:bg-gold-300">
          + Nieuw ontwerp
        </a>
      </div>

      <div className="mt-6 space-y-3">
        {sp.melding === "wachtwoord-gewijzigd" && <Alert tone="success">Je wachtwoord is gewijzigd.</Alert>}
        {error && <Alert>{error}</Alert>}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="mijn-ontwerpen">
          <h2 id="mijn-ontwerpen" className="sr-only">Mijn ontwerpen</h2>
          {projects.length === 0 && !error ? (
            <div className="rounded-3xl border border-dashed border-sand-300 bg-white p-10 text-center">
              <h3 className="font-serif text-2xl text-sand-900">Je hebt nog geen ontwerpen</h3>
              <p className="mx-auto mt-2 max-w-md text-sand-600">Begin met een rechthoekige kamer: vul rechts een naam en de maten in. Je kunt daarna alles nog aanpassen.</p>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2">
              {projects.map((p) => (
                <li key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white">
                  <Link href={`/app/projecten/${p.id}`} className="block bg-sand-50 p-4" aria-label={`${p.name} openen`}>
                    {p.document ? (
                      <PlanSvg floor={p.document.floors[0]!} materials={p.document.materials} className="aspect-[4/3] w-full" title={`Voorbeeld van ${p.name}`} />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center text-sm text-clay-600">Voorbeeld niet beschikbaar</div>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-semibold text-sand-900">
                      <Link href={`/app/projecten/${p.id}`} className="hover:underline">{p.name}</Link>
                    </h3>
                    <p className="text-xs text-sand-600">Laatst gewijzigd: <time dateTime={p.updatedAt}>{dateFormat.format(new Date(p.updatedAt))}</time></p>
                    <div className="mt-3 flex flex-wrap items-start gap-1">
                      <Link href={`/app/projecten/${p.id}`} className="rounded-full bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950 hover:bg-gold-300">Openen</Link>
                      <RenameProjectForm id={p.id} name={p.name} />
                      <DuplicateProjectForm id={p.id} />
                      <DeleteProjectForm id={p.id} name={p.name} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside id="nieuw-ontwerp" aria-labelledby="nieuw-titel" className="h-fit scroll-mt-20 rounded-3xl border border-sand-200 bg-white p-6">
          <h2 id="nieuw-titel" className="text-lg font-semibold text-sand-900">Nieuw ontwerp</h2>
          <div className="mt-4">
            <NewProjectForm disabledReason={atLimit ? "Je hebt het maximale aantal ontwerpen in het gratis plan bereikt. Verwijder een ontwerp om een nieuw te maken." : undefined} />
          </div>
        </aside>
      </div>
    </div>
  );
}
