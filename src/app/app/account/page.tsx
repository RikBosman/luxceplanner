import type { Metadata } from "next";
import { DeleteAccountForm } from "@/components/app/project-forms";
import { getMyPlan } from "@/lib/projects/repository";
import { isLocalMode } from "@/lib/mode";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const [user, plan] = await Promise.all([getSessionUser(), getMyPlan()]);
  const local = isLocalMode();
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
      <h1 className="font-serif text-3xl text-sand-900">Account</h1>
      <section className="rounded-2xl border border-sand-200 bg-white p-6">
        <h2 className="font-semibold text-sand-900">Gegevens</h2>
        <dl className="mt-3 grid grid-cols-[10rem_1fr] gap-2 text-sm">
          <dt className="text-sand-600">E-mailadres</dt><dd>{user?.email}</dd>
          <dt className="text-sand-600">Plan</dt><dd>{plan?.planName ?? "Gratis"}</dd>
          <dt className="text-sand-600">Ontwerpen</dt><dd>{plan ? `${plan.projectCount}${plan.maxProjects != null ? ` van ${plan.maxProjects}` : ""}` : "–"}</dd>
        </dl>
        <p className="mt-4 text-sm text-sand-600">Betaalde abonnementen zijn nog niet beschikbaar. Je wachtwoord wijzig je via “Wachtwoord vergeten” op de inlogpagina.</p>
      </section>
      <section className="rounded-2xl border border-clay-500/30 bg-white p-6">
        <h2 className="font-semibold text-clay-600">{local ? "Alle lokale ontwerpen wissen" : "Account verwijderen"}</h2>
        <p className="mt-2 text-sm text-sand-700">
          {local
            ? "Hiermee wis je alle ontwerpen die op deze computer zijn opgeslagen. Dit kan niet ongedaan worden gemaakt."
            : "Hiermee verwijder je je account en al je ontwerpen direct en definitief. Dit kan niet ongedaan worden gemaakt."}
        </p>
        <div className="mt-4"><DeleteAccountForm local={local} /></div>
      </section>
    </div>
  );
}
