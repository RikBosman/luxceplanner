"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword, type FormState } from "@/lib/auth/actions";
import { Alert, Field } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: FormState = {};

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="volgende" value={next ?? "/app"} />
      <Field label="E-mailadres" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} error={state.fields?.email} />
      <Field label="Wachtwoord" name="password" type="password" autoComplete="current-password" required error={state.fields?.password} />
      <div className="flex justify-end text-sm">
        <Link href="/wachtwoord-vergeten" className="text-gold-700 underline-offset-4 hover:underline">Wachtwoord vergeten?</Link>
      </div>
      <SubmitButton pendingText="Bezig met inloggen…" className="w-full">Inloggen</SubmitButton>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUp, initial);
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="E-mailadres" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} error={state.fields?.email} />
      <Field label="Wachtwoord" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} hint="Minimaal 8 tekens, met minstens één letter en één cijfer." error={state.fields?.password} />
      <Field label="Herhaal wachtwoord" name="passwordConfirm" type="password" autoComplete="new-password" required error={state.fields?.passwordConfirm} />
      <div className="space-y-1">
        <label className="flex items-start gap-3 text-sm text-sand-700">
          <input type="checkbox" name="terms" required className="mt-0.5 size-4 accent-gold-600" aria-describedby={state.fields?.terms ? "terms-fout" : undefined} />
          <span>
            Ik ga akkoord met de <Link href="/voorwaarden" className="text-gold-700 underline" target="_blank">gebruiksvoorwaarden</Link> en heb de{" "}
            <Link href="/privacy" className="text-gold-700 underline" target="_blank">privacyverklaring</Link> gelezen.
          </span>
        </label>
        {state.fields?.terms && <p id="terms-fout" className="text-sm text-clay-600">{state.fields.terms}</p>}
      </div>
      <SubmitButton pendingText="Account aanmaken…" className="w-full">Account aanmaken</SubmitButton>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action] = useActionState(requestPasswordReset, initial);
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="E-mailadres" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} error={state.fields?.email} />
      <SubmitButton pendingText="Versturen…" className="w-full">Stuur herstellink</SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Nieuw wachtwoord" name="password" type="password" autoComplete="new-password" required hint="Minimaal 8 tekens, met minstens één letter en één cijfer." error={state.fields?.password} />
      <Field label="Herhaal nieuw wachtwoord" name="passwordConfirm" type="password" autoComplete="new-password" required error={state.fields?.passwordConfirm} />
      <SubmitButton pendingText="Opslaan…" className="w-full">Wachtwoord opslaan</SubmitButton>
    </form>
  );
}
