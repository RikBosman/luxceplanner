import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isLocalMode } from "@/lib/mode";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Draait vóór elk verzoek naar de app: ververst de Supabase-sessie en stuurt niet-ingelogde
 * bezoekers van /app naar de inlogpagina. Dit is een eerste verdedigingslinie; de echte
 * toegangscontrole gebeurt opnieuw op de server en in de database (RLS).
 */
export async function proxy(request: NextRequest) {
  // Lokale modus: geen accounts, alles is toegankelijk op deze computer.
  if (isLocalMode()) return NextResponse.next();
  const isAppRoute = request.nextUrl.pathname === "/app" || request.nextUrl.pathname.startsWith("/app/");
  const env = getSupabaseEnv();

  const redirectToLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/inloggen";
    url.search = "";
    url.searchParams.set("volgende", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  };

  if (!env) return isAppRoute ? redirectToLogin() : NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (isAppRoute && !data.user) return redirectToLogin();
  return response;
}

export const config = {
  matcher: ["/app/:path*", "/inloggen", "/registreren", "/wachtwoord-herstellen", "/auth/:path*"],
};
