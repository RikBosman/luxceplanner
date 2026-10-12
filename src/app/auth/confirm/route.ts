import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeAppPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Verwerkt links uit e-mails (accountbevestiging en wachtwoordherstel).
 * Ondersteunt zowel ?token_hash=…&type=… (aanbevolen e-mailsjabloon, werkt ook in een andere browser)
 * als ?code=… (PKCE-flow).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeAppPath(url.searchParams.get("volgende"));
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  const fail = () => NextResponse.redirect(new URL("/inloggen?melding=link-ongeldig", url.origin));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail();
    return NextResponse.redirect(new URL(type === "recovery" ? "/wachtwoord-herstellen" : next, url.origin));
  }
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail();
    return NextResponse.redirect(new URL(next, url.origin));
  }
  return fail();
}
