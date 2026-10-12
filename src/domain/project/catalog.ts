/**
 * Startbibliotheek van meubels. Afmetingen in mm (breedte × diepte × hoogte), gebaseerd op gangbare maten.
 * De 2D-symbolen en 3D-vormen zijn eenvoudige, zelfgemaakte geometrie (geen modellen van derden).
 */
export type FurnitureCategory = "woonkamer" | "eetkamer" | "slaapkamer" | "werkkamer" | "keuken" | "badkamer" | "decoratie";

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
  /** Standaardhoogte van de onderkant boven de vloer (bijv. een kunstwerk aan de muur). */
  elevation?: number;
}

export const FURNITURE_CATALOG: readonly CatalogItem[] = [
  { catalogId: "sofa-3", name: "Bank (3-zits)", kind: "sofa", category: "woonkamer", width: 2100, depth: 900, height: 850, color: "#d6c7b0", free: true },
  { catalogId: "sofa-lounge", name: "Loungebank", kind: "lounge-sofa", category: "woonkamer", width: 2800, depth: 1100, height: 720, color: "#8a4b2c", free: true },
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
  { catalogId: "side-table-round", name: "Bijzettafel rond", kind: "side-table", category: "decoratie", width: 550, depth: 550, height: 450, color: "#1e1b19", free: true },
  { catalogId: "floor-lamp", name: "Staande lamp", kind: "floor-lamp", category: "decoratie", width: 450, depth: 450, height: 1650, color: "#5a3e2e", free: true },
  { catalogId: "vase-branches", name: "Vaas met takken", kind: "vase", category: "decoratie", width: 380, depth: 380, height: 1300, color: "#b9a68a", free: true },
  { catalogId: "wall-art", name: "Kunstwerk", kind: "art", category: "decoratie", width: 1100, depth: 40, height: 1450, color: "#5a564c", free: true, elevation: 950 },
  { catalogId: "curtain", name: "Gordijn", kind: "curtain", category: "decoratie", width: 800, depth: 140, height: 2500, color: "#d8c8ae", free: true },
  { catalogId: "rug", name: "Vloerkleed", kind: "rug", category: "decoratie", width: 2400, depth: 1700, height: 12, color: "#8c7b68", free: true },
];

export function getCatalogItem(catalogId: string): CatalogItem | undefined {
  return FURNITURE_CATALOG.find((item) => item.catalogId === catalogId);
}
