"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProject, deleteAccount, deleteProject, duplicateProject, renameProject, type ActionState } from "@/lib/projects/actions";
import { Alert, Field } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: ActionState = {};

export function NewProjectForm({ disabledReason }: { disabledReason?: string }) {
  const [state, action] = useActionState(createProject, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      {disabledReason && <Alert tone="info">{disabledReason}</Alert>}
      <Field label="Naam van je ontwerp" name="name" required maxLength={120} defaultValue="Mijn kamer" error={state.fields?.name} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-sand-800">Start met een rechthoekige kamer (optioneel)</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Breedte" name="width" inputMode="decimal" placeholder="bijv. 4 m" defaultValue="4 m" error={state.fields?.width} />
          <Field label="Lengte" name="length" inputMode="decimal" placeholder="bijv. 5 m" defaultValue="5 m" error={state.fields?.length} />
        </div>
        <p className="text-xs text-sand-600">Binnenmaten. Je mag m, cm of mm gebruiken; zonder eenheid rekenen we in mm. Laat leeg voor een lege plattegrond.</p>
      </fieldset>
      <SubmitButton pendingText="Ontwerp aanmaken…" className="w-full">Ontwerp aanmaken</SubmitButton>
    </form>
  );
}

export function RenameProjectForm({ id, name }: { id: string; name: string }) {
  const [state, action] = useActionState(renameProject, initial);
  const ref = useRef<HTMLDetailsElement>(null);
  const prev = useRef(state);
  useEffect(() => {
    // Sluit het paneel na een geslaagde wijziging.
    if (state !== prev.current && !state.error && !state.fields && ref.current) ref.current.open = false;
    prev.current = state;
  }, [state]);
  return (
    <details ref={ref} className="group">
      <summary className="cursor-pointer list-none rounded-full px-3 py-1.5 text-sm text-sand-700 hover:bg-sand-100 [&::-webkit-details-marker]:hidden">Hernoemen</summary>
      <form action={action} className="mt-2 space-y-2" noValidate>
        <input type="hidden" name="id" value={id} />
        {state.error && <Alert>{state.error}</Alert>}
        <Field label="Nieuwe naam" name="name" id={`naam-${id}`} defaultValue={name} required maxLength={120} error={state.fields?.name} />
        <SubmitButton pendingText="Opslaan…" variant="secondary">Naam opslaan</SubmitButton>
      </form>
    </details>
  );
}

export function DuplicateProjectForm({ id }: { id: string }) {
  const [state, action] = useActionState(duplicateProject, initial);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-full px-3 py-1.5 text-sm text-sand-700 hover:bg-sand-100">Dupliceren</button>
      {state.error && <div className="mt-2"><Alert>{state.error}</Alert></div>}
    </form>
  );
}

export function DeleteProjectForm({ id, name, backToDashboard = false }: { id: string; name: string; backToDashboard?: boolean }) {
  const [state, action] = useActionState(deleteProject, initial);
  return (
    <details className="group">
      <summary className="cursor-pointer list-none rounded-full px-3 py-1.5 text-sm text-clay-600 hover:bg-clay-500/10 [&::-webkit-details-marker]:hidden">Verwijderen</summary>
      <form action={action} className="mt-2 space-y-2 rounded-xl border border-clay-500/30 bg-clay-500/5 p-3">
        <input type="hidden" name="id" value={id} />
        {backToDashboard && <input type="hidden" name="terug" value="1" />}
        <p className="text-sm text-sand-800">Weet je zeker dat je <strong>{name}</strong> definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.</p>
        {state.error && <Alert>{state.error}</Alert>}
        <SubmitButton pendingText="Verwijderen…" variant="danger">Ja, verwijder ontwerp</SubmitButton>
      </form>
    </details>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, initial);
  return (
    <form action={action} className="space-y-3" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      <Field label='Typ "VERWIJDER" om te bevestigen' name="bevestiging" autoComplete="off" error={state.fields?.bevestiging} />
      <SubmitButton pendingText="Account verwijderen…" variant="danger">Account en alle ontwerpen verwijderen</SubmitButton>
    </form>
  );
}
