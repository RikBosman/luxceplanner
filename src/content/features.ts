/**
 * Overzicht van functies met hun werkelijke status. Houd dit eerlijk bij: de functiepagina toont deze status.
 */
export type FeatureStatus = "beschikbaar" | "in-ontwikkeling" | "gepland";

export const FEATURE_GROUPS: readonly { title: string; items: readonly { name: string; text: string; status: FeatureStatus }[] }[] = [
  {
    title: "Account en projecten",
    items: [
      { name: "Account met e-mailverificatie", text: "Registreren, inloggen, wachtwoord herstellen en uitloggen.", status: "beschikbaar" },
      { name: "Projectoverzicht", text: "Ontwerpen aanmaken, openen, hernoemen, dupliceren en verwijderen.", status: "beschikbaar" },
      { name: "Privé opgeslagen", text: "Ontwerpen zijn alleen zichtbaar voor jou; dit wordt in de database afgedwongen.", status: "beschikbaar" },
      { name: "Account verwijderen", text: "Verwijder je account en al je ontwerpen in één keer.", status: "beschikbaar" },
    ],
  },
  {
    title: "2D-plattegrond",
    items: [
      { name: "Kamer op maat starten", text: "Vul breedte en lengte in en begin direct met een rechthoekige kamer.", status: "beschikbaar" },
      { name: "Muren tekenen en bewerken", text: "Muren toevoegen, verplaatsen, op lengte zetten en verwijderen, met snappen aan raster en hoeken.", status: "in-ontwikkeling" },
      { name: "Deuren en ramen", text: "Openingen in muren plaatsen, verschuiven en omdraaien.", status: "in-ontwikkeling" },
      { name: "Meubels plaatsen", text: "Een startbibliotheek met 11 meubels die je verplaatst en draait.", status: "in-ontwikkeling" },
      { name: "Ongedaan maken en opnieuw", text: "Elke stap terug of vooruit, ook met sneltoetsen.", status: "in-ontwikkeling" },
      { name: "Automatisch opslaan", text: "Wijzigingen worden opgeslagen; je ziet altijd de status.", status: "in-ontwikkeling" },
    ],
  },
  {
    title: "3D-weergave",
    items: [
      { name: "Interactief 3D-model", text: "Muren, vloer, deuren, ramen en meubels ruimtelijk bekijken en eromheen draaien.", status: "gepland" },
      { name: "Kleuren en materialen", text: "Basiskleuren voor muren, vloeren en meubels.", status: "gepland" },
      { name: "Rondwandelen en fotorealistische beelden", text: "Voor een latere fase.", status: "gepland" },
    ],
  },
  {
    title: "Later",
    items: [
      { name: "Meerdere verdiepingen", text: "Het gegevensmodel is hier al op voorbereid.", status: "gepland" },
      { name: "Export (PNG, PDF)", text: "Je plattegrond delen of afdrukken.", status: "gepland" },
      { name: "Betaalde abonnementen", text: "Plus en Pro met meer projecten, objecten en export.", status: "gepland" },
    ],
  },
];
