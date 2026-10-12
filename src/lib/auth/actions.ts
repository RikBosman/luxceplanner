"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site";
import { safeAppPath } from "@/lib/safe-redirect";
import { SUPABASE_NOT_CONFIGURED } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authErrorMessage } from "./messages";
import { fieldErrors, newPasswordSchema, resetRequestSchema, signInSchema, signUpSchema, type FieldErrors } from "./schemas";

export interface FormState {
  error?: string;
  success?: string;
  fields?: FieldErrors;
  values?: Record<string, string>;
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  // Gebruik de geconfigureerde URL in productie; val lokaal terug op de host van het verzoek.
  return process.env.NODE_ENV === "production" || !host ? siteConfig.url : `${proto}://${host}`;
}

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

export async function signUp(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { email: str(fd, "email") };
  const parsed = signUpSchema.safeParse({
    email: str(fd, "email"), password: str(fd, "password"), passwordConfirm: str(fd, "passwordConfirm"), terms: fd.get("terms") ?? undefined,
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: SUPABASE_NOT_CONFIGURED, values };

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${await origin()}/auth/confirm?volgende=/app` },
  });
  if (error) return { error: authErrorMessage(error), values };
  // Altijd dezelfde melding, zodat niet te achterhalen is of een e-mailadres al een account heeft.
  return { success: "Bijna klaar! We hebben je een e-mail gestuurd. Klik op de link in die e-mail om je account te bevestigen." };
}

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { email: str(fd, "email") };
  const parsed = signInSchema.safeParse({ email: str(fd, "email"), password: str(fd, "password") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: SUPABASE_NOT_CONFIGURED, values };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error), values };
  redirect(safeAppPath(str(fd, "volgende")));
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { email: str(fd, "email") };
  const parsed = resetRequestSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: SUPABASE_NOT_CONFIGURED, values };

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/confirm?volgende=/wachtwoord-herstellen`,
  });
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) return { error: authErrorMessage(error), values };
  return { success: "Als er een account bij dit e-mailadres hoort, ontvang je binnen enkele minuten een e-mail met een link om je wachtwoord opnieuw in te stellen." };
}

export async function updatePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse({ password: str(fd, "password"), passwordConfirm: str(fd, "passwordConfirm") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: SUPABASE_NOT_CONFIGURED };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Je herstellink is verlopen. Vraag een nieuwe link aan." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authErrorMessage(error) };
  redirect("/app?melding=wachtwoord-gewijzigd");
}
