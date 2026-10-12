/** Leest de Supabase-configuratie. Geeft null als die (nog) ontbreekt, zodat de site niet crasht. */
export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export const SUPABASE_NOT_CONFIGURED =
  "Accounts zijn nog niet geconfigureerd: stel NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in (zie README).";
