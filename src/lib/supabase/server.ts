import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/** Supabase-client voor Server Components, Server Actions en Route Handlers (met de sessie van de gebruiker). */
export async function createSupabaseServerClient() {
  // Eerst cookies() aanroepen: maakt de route altijd dynamisch, ook als Supabase (nog) niet is geconfigureerd.
  const cookieStore = await cookies();
  const env = getSupabaseEnv();
  if (!env) return null;
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Aangeroepen vanuit een Server Component: cookies kunnen daar niet worden gezet.
          // De proxy ververst de sessie al bij elk verzoek.
        }
      },
    },
  });
}

/** Geeft de geverifieerde gebruiker (via de Auth-server gecontroleerd, niet alleen op basis van een cookie). */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null } as const;
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user } as const;
}
