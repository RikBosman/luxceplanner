import "server-only";
import { isLocalMode, LOCAL_USER } from "@/lib/mode";
import { getCurrentUser } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string | undefined;
}

/** De ingelogde gebruiker; in lokale modus altijd de vaste lokale gebruiker. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (isLocalMode()) return { ...LOCAL_USER };
  const { user } = await getCurrentUser();
  return user ? { id: user.id, email: user.email } : null;
}
