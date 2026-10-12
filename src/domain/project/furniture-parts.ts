/**
 * Gedetailleerde, zelfgemaakte 3D-vormen per meubeltype, opgebouwd uit blokken (geen modellen van derden).
 * Gebruikt door zowel de interactieve 3D-weergave als de 3D-voorbeelden op de website.
 *
 * Lokaal assenstelsel in mm: x = breedte (midden op 0), z = diepte (voorkant naar +z), y = hoogte (vloer = 0).
 * Elk onderdeel valt binnen de opgegeven buitenmaten (w × h × d), behalve een hoofdbord dat iets hoger mag zijn.
 */
export interface LocalBox {
  /** Middelpunt. */
  x: number;
  y: number;
  z: number;
  /** Afmetingen. */
  sx: number;
  sy: number;
  sz: number;
  /** Lichter/donkerder dan de basiskleur (1 = gelijk). */
  shade?: number;
  /** Vaste kleur (bijv. hout, messing); anders de basiskleur van het meubel. */
  color?: string;
}

/** Vaste materiaalkleuren voor onderdelen. */
export const PART_COLORS = {
  oak: "#a77c52",
  walnut: "#5b3d29",
  blackMetal: "#24211f",
  brass: "#c9a24a",
  linen: "#f2ede4",
  pillow: "#e6dfd2",
  throw: "#b38b4f",
  stone: "#e4dfd6",
  steel: "#c3c7c9",
  cooktop: "#1b1a19",
  porcelain: "#f7f6f3",
} as const;

const BOOK_COLORS = ["#3d2f25", "#8a6a3b", "#c9b79c", "#2f3a36", "#9b4a37", "#e6dccb", "#5c5146", "#1f2a33", "#b9975b"];

/** Blok tussen twee hoeken (makkelijker te lezen dan middelpunt + maat). */
function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, extra: Partial<LocalBox> = {}): LocalBox {
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, sx: Math.abs(x1 - x0), sy: Math.abs(y1 - y0), sz: Math.abs(z1 - z0), ...extra };
}

/** Vier poten in de hoeken. */
function legs(w: number, d: number, height: number, inset: number, size: number, color: string): LocalBox[] {
  return [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => {
      const x = sx * (w / 2 - inset - size / 2);
      const z = sz * (d / 2 - inset - size / 2);
      return box(x - size / 2, x + size / 2, 0, height, z - size / 2, z + size / 2, { color });
    }),
  );
}

/** Deterministische pseudo-willekeur (zelfde ontwerp = zelfde beeld). */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function seating(w: number, d: number, h: number, single: boolean): LocalBox[] {
  const legH = Math.min(90, h * 0.1);
  const arm = Math.min(w * (single ? 0.17 : 0.1), 190);
  const back = Math.min(d * 0.2, 190);
  const seatTop = h * 0.5;
  const cushionH = Math.min(130, seatTop * 0.35);
  const parts: LocalBox[] = [
    ...legs(w, d, legH, 50, 45, PART_COLORS.walnut),
    // Onderstel
    box(-w / 2, w / 2, legH, seatTop - cushionH, -d / 2, d / 2, { shade: 0.86 }),
    // Rugleuning en armleuningen
    box(-w / 2, w / 2, legH, h, -d / 2, -d / 2 + back, { shade: 0.9 }),
    box(-w / 2, -w / 2 + arm, legH, h * 0.7, -d / 2, d / 2, { shade: 0.95 }),
    box(w / 2 - arm, w / 2, legH, h * 0.7, -d / 2, d / 2, { shade: 0.95 }),
  ];
  const inner = w - 2 * arm;
  const n = single ? 1 : Math.max(1, Math.round(inner / 700));
  const gap = 14;
  const cw = (inner - (n - 1) * gap) / n;
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + arm + i * (cw + gap);
    // Zitkussen (licht bol: iets lichter) en rugkussen
    parts.push(box(x0, x0 + cw, seatTop - cushionH, seatTop, -d / 2 + back, d / 2 - 15, { shade: 1.06 }));
    parts.push(box(x0 + 10, x0 + cw - 10, seatTop, h - 25, -d / 2 + back, -d / 2 + back + Math.min(170, d * 0.18), { shade: 1.0 }));
  }
  if (!single && inner > 1000) {
    // Sierkussens in de hoeken
    parts.push(box(-w / 2 + arm + 40, -w / 2 + arm + 420, seatTop, seatTop + 360, -d / 2 + back + 170, -d / 2 + back + 300, { color: PART_COLORS.throw }));
    parts.push(box(w / 2 - arm - 420, w / 2 - arm - 40, seatTop, seatTop + 360, -d / 2 + back + 170, -d / 2 + back + 300, { color: PART_COLORS.pillow }));
  }
  return parts;
}

function bed(w: number, d: number, h: number): LocalBox[] {
  const frameTop = Math.max(200, h - 220);
  const head = 80;
  const z0 = -d / 2 + head;
  return [
    // Bedframe en hoofdbord (gestoffeerd in de basiskleur)
    box(-w / 2, w / 2, 40, frameTop, -d / 2, d / 2, { shade: 0.82 }),
    ...legs(w, d, 40, 40, 60, PART_COLORS.walnut),
    box(-w / 2 - 20, w / 2 + 20, 0, h + 550, -d / 2, z0, { shade: 0.92 }),
    // Matras, dekbed, kussens en plaid
    box(-w / 2 + 25, w / 2 - 25, frameTop, h, z0 + 10, d / 2 - 25, { color: PART_COLORS.linen }),
    box(-w / 2 + 10, w / 2 - 10, h - 60, h + 45, z0 + d * 0.27, d / 2 - 10, { color: PART_COLORS.linen, shade: 0.98 }),
    box(-w / 2 + 70, -20, h, h + 130, z0 + 60, z0 + 60 + Math.min(420, d * 0.2), { color: PART_COLORS.pillow }),
    box(20, w / 2 - 70, h, h + 130, z0 + 60, z0 + 60 + Math.min(420, d * 0.2), { color: PART_COLORS.pillow }),
    box(-w / 2 + 5, w / 2 - 5, h + 45, h + 60, d / 2 - 520, d / 2 - 140, { color: PART_COLORS.throw }),
  ];
}

function table(kind: string, w: number, d: number, h: number): LocalBox[] {
  const top = kind === "coffee-table" ? 45 : 35;
  const legColor = kind === "desk" ? PART_COLORS.blackMetal : kind === "coffee-table" ? PART_COLORS.brass : PART_COLORS.walnut;
  const legSize = kind === "desk" ? 35 : kind === "coffee-table" ? 30 : 60;
  const parts: LocalBox[] = [box(-w / 2, w / 2, h - top, h, -d / 2, d / 2), ...legs(w, d, h - top, kind === "coffee-table" ? 30 : 50, legSize, legColor)];
  if (kind === "coffee-table") {
    // Onderblad
    parts.push(box(-w / 2 + 50, w / 2 - 50, 110, 130, -d / 2 + 50, d / 2 - 50, { shade: 0.85 }));
  }
  if (kind === "desk") {
    // Ladeblok met messing greep
    const x1 = w / 2 - 60;
    const x0 = Math.max(-w / 2 + 60, x1 - 420);
    parts.push(box(x0, x1, h - top - 160, h - top, -d / 2 + 40, d / 2 - 30, { shade: 0.9 }));
    parts.push(box((x0 + x1) / 2 - 70, (x0 + x1) / 2 + 70, h - top - 95, h - top - 80, d / 2 - 30, d / 2 - 15, { color: PART_COLORS.brass }));
  }
  return parts;
}

function chair(w: number, d: number, h: number): LocalBox[] {
  const seat = Math.min(470, h * 0.52);
  return [
    ...legs(w, d, seat - 40, 15, 35, PART_COLORS.walnut),
    box(-w / 2, w / 2, seat - 40, seat - 10, -d / 2, d / 2, { color: PART_COLORS.walnut }),
    box(-w / 2 + 15, w / 2 - 15, seat - 10, seat + 25, -d / 2 + 30, d / 2 - 10, { shade: 1.05 }),
    box(-w / 2 + 15, -w / 2 + 45, seat - 10, h, -d / 2, -d / 2 + 30, { color: PART_COLORS.walnut }),
    box(w / 2 - 45, w / 2 - 15, seat - 10, h, -d / 2, -d / 2 + 30, { color: PART_COLORS.walnut }),
    box(-w / 2 + 15, w / 2 - 15, h - 260, h - 20, -d / 2 + 5, -d / 2 + 40),
  ];
}

function wardrobe(w: number, d: number, h: number): LocalBox[] {
  const plinth = 70;
  const n = Math.max(2, Math.round(w / 500));
  const gap = 5;
  const doorW = (w - 20 - (n - 1) * gap) / n;
  const parts: LocalBox[] = [
    box(-w / 2 + 20, w / 2 - 20, 0, plinth, -d / 2 + 20, d / 2 - 40, { color: PART_COLORS.walnut }),
    box(-w / 2, w / 2, plinth, h, -d / 2, d / 2 - 22, { shade: 0.9 }),
  ];
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + 10 + i * (doorW + gap);
    parts.push(box(x0, x0 + doorW, plinth + 8, h - 8, d / 2 - 22, d / 2 - 2));
    const handleX = i % 2 === 0 ? x0 + doorW - 45 : x0 + 30;
    parts.push(box(handleX, handleX + 15, h * 0.42, h * 0.62, d / 2 - 2, d / 2 + 18, { color: PART_COLORS.brass }));
  }
  return parts;
}

function bookcase(w: number, d: number, h: number): LocalBox[] {
  const t = 22;
  const parts: LocalBox[] = [
    box(-w / 2, w / 2, 0, h, -d / 2, -d / 2 + 12, { shade: 0.78 }),
    box(-w / 2, -w / 2 + t, 0, h, -d / 2, d / 2),
    box(w / 2 - t, w / 2, 0, h, -d / 2, d / 2),
    box(-w / 2 + t, w / 2 - t, h - t, h, -d / 2, d / 2),
    box(-w / 2 + t, w / 2 - t, 0, 60, -d / 2, d / 2, { shade: 0.85 }),
  ];
  const shelves = Math.max(2, Math.round(h / 380));
  const spacing = (h - 60 - t) / shelves;
  const rnd = seeded(Math.round(w * 7 + h * 3 + d));
  for (let s = 0; s < shelves; s++) {
    const y0 = 60 + s * spacing;
    if (s > 0) parts.push(box(-w / 2 + t, w / 2 - t, y0 - t / 2, y0 + t / 2, -d / 2 + 12, d / 2));
    // Boeken in groepjes, met wat lege ruimte voor een rustig, gestyled beeld.
    let x = -w / 2 + t + 10 + rnd() * 40;
    const end = w / 2 - t - 10;
    while (x < end - 50) {
      const groupW = Math.min(end - x, 60 + rnd() * 110);
      const bookH = spacing * (0.62 + rnd() * 0.25);
      const color = BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)]!;
      parts.push(box(x, x + groupW, y0 + t / 2, y0 + t / 2 + bookH, -d / 2 + 30, d / 2 - 25, { color }));
      x += groupW + (rnd() < 0.3 ? 80 + rnd() * 120 : 6);
    }
  }
  return parts;
}

function kitchen(w: number, d: number, h: number): LocalBox[] {
  const plinth = 100;
  const counter = 40;
  const front = d / 2 - 30;
  const n = Math.max(1, Math.round(w / 600));
  const gap = 4;
  const doorW = (w - (n - 1) * gap) / n;
  const parts: LocalBox[] = [
    box(-w / 2, w / 2, 0, plinth, -d / 2, front - 60, { color: PART_COLORS.blackMetal }),
    box(-w / 2, w / 2, plinth, h - counter, -d / 2, front - 18, { shade: 0.9 }),
    box(-w / 2 - 10, w / 2 + 10, h - counter, h, -d / 2, d / 2, { color: PART_COLORS.stone }),
  ];
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + i * (doorW + gap);
    parts.push(box(x0, x0 + doorW, plinth + 5, h - counter - 5, front - 18, front));
    parts.push(box(x0 + doorW / 2 - 110, x0 + doorW / 2 + 110, h - counter - 70, h - counter - 58, front, front + 14, { color: PART_COLORS.brass }));
  }
  // Spoelbak met kraan, en kookplaat
  const sinkX = -w / 2 + w * 0.68;
  parts.push(box(sinkX - 260, sinkX + 260, h - 4, h + 2, -d / 2 + 110, d / 2 - 90, { color: PART_COLORS.steel }));
  parts.push(box(sinkX - 15, sinkX + 15, h, h + 300, -d / 2 + 40, -d / 2 + 70, { color: PART_COLORS.brass }));
  const cookX = -w / 2 + w * 0.25;
  if (w > 1500) parts.push(box(cookX - 300, cookX + 300, h, h + 6, -d / 2 + 70, d / 2 - 70, { color: PART_COLORS.cooktop }));
  return parts;
}

function vanity(w: number, d: number, h: number): LocalBox[] {
  const top = 25;
  const base = 220; // zwevend meubel
  return [
    box(-w / 2, w / 2, base, h - top, -d / 2, d / 2 - 20, { shade: 0.92 }),
    box(-w / 2 + 6, w / 2 - 6, base + 6, (base + h - top) / 2 - 3, d / 2 - 20, d / 2 - 2),
    box(-w / 2 + 6, w / 2 - 6, (base + h - top) / 2 + 3, h - top - 6, d / 2 - 20, d / 2 - 2),
    box(-60, 60, (base + h - top) / 2 + 40, (base + h - top) / 2 + 52, d / 2 - 2, d / 2 + 12, { color: PART_COLORS.brass }),
    box(-w / 2, w / 2, h - top, h, -d / 2, d / 2, { color: PART_COLORS.stone }),
    box(-w * 0.24, w * 0.24, h, h + 120, -d / 2 + 70, d / 2 - 60, { color: PART_COLORS.porcelain }),
    box(-15, 15, h, h + 260, -d / 2 + 25, -d / 2 + 55, { color: PART_COLORS.brass }),
  ];
}

export function furnitureParts(kind: string, w: number, d: number, h: number): LocalBox[] {
  switch (kind) {
    case "sofa":
      return seating(w, d, h, false);
    case "armchair":
      return seating(w, d, h, true);
    case "bed":
      return bed(w, d, h);
    case "dining-table":
    case "coffee-table":
    case "desk":
      return table(kind, w, d, h);
    case "chair":
      return chair(w, d, h);
    case "wardrobe":
      return wardrobe(w, d, h);
    case "bookcase":
      return bookcase(w, d, h);
    case "kitchen":
      return kitchen(w, d, h);
    case "vanity":
      return vanity(w, d, h);
    default:
      return [box(-w / 2, w / 2, 0, h, -d / 2, d / 2)];
  }
}
