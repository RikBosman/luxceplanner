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
  { catalogId: "sofa-3", name: "Bank (3-zits)", kind: "sofa", category: "woonkamer", width: 2100, depth: 900, height: 850, color: "#8a9a7b", free: true },
  { catalogId: "armchair", name: "Fauteuil", kind: "armchair", category: "woonkamer", width: 850, depth: 850, height: 850, color: "#a3876a", free: true },
  { catalogId: "coffee-table", name: "Salontafel", kind: "coffee-table", category: "woonkamer", width: 1100, depth: 600, height: 420, color: "#b89b72", free: true },
  { catalogId: "dining-table", name: "Eettafel", kind: "dining-table", category: "eetkamer", width: 1800, depth: 900, height: 750, color: "#b89b72", free: true },
  { catalogId: "dining-chair", name: "Eetkamerstoel", kind: "chair", category: "eetkamer", width: 450, depth: 520, height: 900, color: "#6f6455", free: true },
  { catalogId: "bed-double", name: "Tweepersoonsbed", kind: "bed", category: "slaapkamer", width: 1600, depth: 2100, height: 500, color: "#d8cfc0", free: true },
  { catalogId: "wardrobe", name: "Kledingkast", kind: "wardrobe", category: "slaapkamer", width: 1500, depth: 600, height: 2100, color: "#e6dfd3", free: true },
  { catalogId: "desk", name: "Bureau", kind: "desk", category: "werkkamer", width: 1400, depth: 700, height: 750, color: "#c7b294", free: true },
  { catalogId: "bookcase", name: "Boekenkast", kind: "bookcase", category: "werkkamer", width: 800, depth: 350, height: 2000, color: "#a88c6a", free: true },
  { catalogId: "kitchen-unit", name: "Keukenblok", kind: "kitchen", category: "keuken", width: 2400, depth: 620, height: 900, color: "#f1ede6", free: true },
  { catalogId: "bathroom-vanity", name: "Badkamermeubel", kind: "vanity", category: "badkamer", width: 800, depth: 460, height: 850, color: "#f4f2ee", free: true },
];

export function getCatalogItem(catalogId: string): CatalogItem | undefined {
  return FURNITURE_CATALOG.find((item) => item.catalogId === catalogId);
}
