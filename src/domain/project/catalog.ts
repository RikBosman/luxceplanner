/**
 * Startbibliotheek van meubels. Afmetingen in mm (breedte × diepte × hoogte), gebaseerd op gangbare maten.
 * De 2D-symbolen en 3D-vormen zijn eenvoudige, zelfgemaakte geometrie (geen modellen van derden).
 */
export type FurnitureCategory = "woonkamer" | "eetkamer" | "slaapkamer" | "werkkamer" | "keuken" | "badkamer";

export interface CatalogItem {
  catalogId: string;
  name: string;
  kind: string;
  category: FurnitureCategory;
  width: number;
  depth: number;
  height: number;
  /** Standaardkleur voor de eenvoudige 3D-weergave. */
  color: string;
  /** Beschikbaar in het gratis plan. Uiteindelijk wordt dit server-side gecontroleerd. */
  free: boolean;
}

export const FURNITURE_CATALOG: readonly CatalogItem[] = [
  { catalogId: "sofa-3", name: "Bank (3-zits)", kind: "sofa", category: "woonkamer", width: 2100, depth: 900, height: 850, color: "#d6c7b0", free: true },
  { catalogId: "armchair", name: "Fauteuil", kind: "armchair", category: "woonkamer", width: 850, depth: 850, height: 850, color: "#c39a6b", free: true },
  { catalogId: "coffee-table", name: "Salontafel", kind: "coffee-table", category: "woonkamer", width: 1100, depth: 600, height: 420, color: "#3a2a20", free: true },
  { catalogId: "dining-table", name: "Eettafel", kind: "dining-table", category: "eetkamer", width: 1800, depth: 900, height: 750, color: "#a77c52", free: true },
  { catalogId: "dining-chair", name: "Eetkamerstoel", kind: "chair", category: "eetkamer", width: 450, depth: 520, height: 900, color: "#c9b49a", free: true },
  { catalogId: "bed-double", name: "Tweepersoonsbed", kind: "bed", category: "slaapkamer", width: 1600, depth: 2100, height: 500, color: "#8c7a66", free: true },
  { catalogId: "wardrobe", name: "Kledingkast", kind: "wardrobe", category: "slaapkamer", width: 1500, depth: 600, height: 2100, color: "#ece5da", free: true },
  { catalogId: "desk", name: "Bureau", kind: "desk", category: "werkkamer", width: 1400, depth: 700, height: 750, color: "#a77c52", free: true },
  { catalogId: "bookcase", name: "Boekenkast", kind: "bookcase", category: "werkkamer", width: 800, depth: 350, height: 2000, color: "#3a2a20", free: true },
  { catalogId: "kitchen-unit", name: "Keukenblok", kind: "kitchen", category: "keuken", width: 2400, depth: 620, height: 900, color: "#e9e3d9", free: true },
  { catalogId: "bathroom-vanity", name: "Badkamermeubel", kind: "vanity", category: "badkamer", width: 800, depth: 460, height: 850, color: "#5b3d29", free: true },
];

export function getCatalogItem(catalogId: string): CatalogItem | undefined {
  return FURNITURE_CATALOG.find((item) => item.catalogId === catalogId);
}
