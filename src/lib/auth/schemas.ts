import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Vul een geldig e-mailadres in.")).pipe(z.string().max(254));
// Supabase (bcrypt) gebruikt maximaal 72 bytes van een wachtwoord.
const password = z
  .string()
  .min(8, "Gebruik minimaal 8 tekens.")
  .max(72, "Gebruik maximaal 72 tekens.")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "Gebruik minimaal één letter en één cijfer.");

export const signUpSchema = z
  .object({
    email,
    password,
    passwordConfirm: z.string(),
    terms: z.literal("on", { error: "Ga akkoord met de voorwaarden om verder te gaan." }),
  })
  .refine((v) => v.password === v.passwordConfirm, { path: ["passwordConfirm"], message: "De wachtwoorden komen niet overeen." });

export const signInSchema = z.object({ email, password: z.string().min(1, "Vul je wachtwoord in.").max(72) });
export const resetRequestSchema = z.object({ email });
export const newPasswordSchema = z
  .object({ password, passwordConfirm: z.string() })
  .refine((v) => v.password === v.passwordConfirm, { path: ["passwordConfirm"], message: "De wachtwoorden komen niet overeen." });

export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
