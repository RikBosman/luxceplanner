/** Vertaalt databasefouten rond projecten naar begrijpelijke meldingen. */
export function projectErrorMessage(error: { message?: string; code?: string } | null | undefined): string {
  const msg = error?.message ?? "";
  if (msg.includes("project_limit_reached")) {
    return "Je hebt het maximale aantal ontwerpen voor je plan bereikt. Verwijder een ontwerp om een nieuw te maken.";
  }
  if (msg.includes("revision_conflict")) {
    return "Dit ontwerp is intussen ergens anders gewijzigd (bijvoorbeeld in een ander tabblad).";
  }
  if (msg.includes("project_not_found") || error?.code === "PGRST116") {
    return "Dit ontwerp bestaat niet (meer) of je hebt er geen toegang toe.";
  }
  if (error?.code === "23514") return "De gegevens van dit ontwerp zijn ongeldig of te groot.";
  return "Er ging iets mis bij het opslaan. Controleer je verbinding en probeer het opnieuw.";
}
