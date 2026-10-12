/**
 * Gedetailleerde, zelfgemaakte 3D-vormen per meubeltype (geen modellen van derden).
 * Gebruikt door de interactieve 3D-weergave en de gerenderde voorbeelden op de website.
 *
 * Lokaal assenstelsel in mm: x = breedte (midden op 0), z = diepte (voorkant naar +z), y = hoogte (vloer = 0).
 * Elk onderdeel valt binnen de opgegeven buitenmaten (w × h × d), behalve een hoofdbord dat iets hoger mag zijn.
 */
export type PartShape = "box" | "rounded" | "cylinder" | "sphere";
export type PartFinish = "fabric" | "boucle" | "velvet" | "linen" | "wood" | "lacquer" | "metal" | "brass" | "stone" | "ceramic" | "glass" | "paper" | "matte" | "light";

export interface LocalBox {
  /** Middelpunt. */
  x: number;
  y: number;
  z: number;
  /** Afmetingen (omhullend kader). */
  sx: number;
  sy: number;
  sz: number;
  /** Vorm: blok, afgerond blok, staande cilinder (ellips met sx × sz) of bol/ellipsoïde. */
  shape?: PartShape;
  /** Afrondingsstraal in mm (alleen voor "rounded"). */
  radius?: number;
  /** Verhouding bovenkant/onderkant van een cilinder (bijv. 0,7 voor een taps toelopende poot). */
  taper?: number;
  /** Lichter/donkerder dan de basiskleur (1 = gelijk). */
  shade?: number;
  /** Vaste kleur (bijv. hout, messing); anders de basiskleur van het meubel. */
  color?: string;
  /** Materiaalsoort voor de belichting (glans, ruwheid). */
  finish?: PartFinish;
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
  ceramic: "#8d8478",
  shadeGlow: "#f3dfb6",
  branch: "#7a5a3c",
  canvas: "#efe9df",
} as const;

const BOOK_COLORS = ["#3d2f25", "#8a6a3b", "#c9b79c", "#2f3a36", "#9b4a37", "#e6dccb", "#5c5146", "#1f2a33", "#b9975b"];

type Extra = Partial<LocalBox>;

/** Blok tussen twee hoeken. */
function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, extra: Extra = {}): LocalBox {
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, sx: Math.abs(x1 - x0), sy: Math.abs(y1 - y0), sz: Math.abs(z1 - z0), ...extra };
}

/** Afgerond blok tussen twee hoeken. */
function soft(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, radius: number, extra: Extra = {}): LocalBox {
  return box(x0, x1, y0, y1, z0, z1, { shape: "rounded", radius, ...extra });
}

/** Staande cilinder met middelpunt (x, z) en diameters dx × dz. */
function cyl(x: number, z: number, dx: number, dz: number, y0: number, y1: number, extra: Extra = {}): LocalBox {
  return { x, y: (y0 + y1) / 2, z, sx: dx, sy: Math.abs(y1 - y0), sz: dz, shape: "cylinder", ...extra };
}

/** Bol/ellipsoïde met middelpunt en diameters. */
function ball(x: number, y: number, z: number, dx: number, dy: number, dz: number, extra: Extra = {}): LocalBox {
  return { x, y, z, sx: dx, sy: dy, sz: dz, shape: "sphere", ...extra };
}

/** Vier ronde, taps toelopende poten in de hoeken. */
function legs(w: number, d: number, height: number, inset: number, size: number, color: string, finish: PartFinish = "wood"): LocalBox[] {
  return [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => cyl(sx * (w / 2 - inset - size / 2), sz * (d / 2 - inset - size / 2), size, size, 0, height, { color, finish, taper: 1.35 })),
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

function sofa(w: number, d: number, h: number): LocalBox[] {
  const legH = Math.min(90, h * 0.1);
  const arm = Math.min(w * 0.1, 190);
  const back = Math.min(d * 0.2, 190);
  const seatTop = h * 0.5;
  const cushionH = Math.min(140, seatTop * 0.36);
  const parts: LocalBox[] = [
    ...legs(w, d, legH, 50, 45, PART_COLORS.walnut),
    soft(-w / 2, w / 2, legH, seatTop - cushionH + 20, -d / 2, d / 2, 30, { shade: 0.86, finish: "fabric" }),
    soft(-w / 2, w / 2, legH, h, -d / 2, -d / 2 + back, 70, { shade: 0.9, finish: "fabric" }),
    soft(-w / 2, -w / 2 + arm, legH, h * 0.7, -d / 2, d / 2, arm * 0.45, { shade: 0.95, finish: "fabric" }),
    soft(w / 2 - arm, w / 2, legH, h * 0.7, -d / 2, d / 2, arm * 0.45, { shade: 0.95, finish: "fabric" }),
  ];
  const inner = w - 2 * arm;
  const n = Math.max(1, Math.round(inner / 700));
  const gap = 10;
  const cw = (inner - (n - 1) * gap) / n;
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + arm + i * (cw + gap);
    parts.push(soft(x0, x0 + cw, seatTop - cushionH, seatTop, -d / 2 + back - 10, d / 2 - 10, 55, { shade: 1.05, finish: "fabric" }));
    parts.push(soft(x0 + 8, x0 + cw - 8, seatTop - 20, h - 20, -d / 2 + back - 20, -d / 2 + back + Math.min(180, d * 0.19), 80, { finish: "fabric" }));
  }
  if (inner > 1000) {
    parts.push(soft(-w / 2 + arm + 40, -w / 2 + arm + 440, seatTop, Math.min(seatTop + 400, h - 10), -d / 2 + back + 150, -d / 2 + back + 300, 90, { color: PART_COLORS.throw, finish: "linen" }));
    parts.push(soft(w / 2 - arm - 440, w / 2 - arm - 40, seatTop, Math.min(seatTop + 400, h - 10), -d / 2 + back + 150, -d / 2 + back + 300, 90, { color: PART_COLORS.pillow, finish: "linen" }));
  }
  return parts;
}

/** Organische fauteuil (zoals een bouclé "teddy"-stoel): ronde vormen en houten pootjes. */
function armchair(w: number, d: number, h: number): LocalBox[] {
  const legH = Math.min(140, h * 0.16);
  const seatTop = h * 0.5;
  const arm = w * 0.22;
  return [
    ...legs(w, d, legH + 20, 70, 40, PART_COLORS.walnut),
    soft(-w / 2 + 30, w / 2 - 30, legH, seatTop - 60, -d / 2 + 40, d / 2 - 20, 120, { finish: "boucle", shade: 0.95 }),
    soft(-w / 2 + arm - 30, w / 2 - arm + 30, seatTop - 110, seatTop + 10, -d / 2 + d * 0.3, d / 2 - 10, 60, { finish: "boucle", shade: 1.04 }),
    // Ronde rugleuning die doorloopt in de armen
    soft(-w / 2 + 20, w / 2 - 20, legH + 60, h, -d / 2, -d / 2 + d * 0.36, 170, { finish: "boucle" }),
    soft(-w / 2, -w / 2 + arm, legH + 40, h * 0.74, -d / 2 + 40, d / 2 - 40, arm / 2 - 5, { finish: "boucle" }),
    soft(w / 2 - arm, w / 2, legH + 40, h * 0.74, -d / 2 + 40, d / 2 - 40, arm / 2 - 5, { finish: "boucle" }),
  ];
}

/** Lage loungebank zoals een daybed: houten plint, dikke zitkussens, rugkussens en sierkussens. */
function loungeSofa(w: number, d: number, h: number): LocalBox[] {
  const plinth = 110;
  const seatTop = Math.min(430, h * 0.6);
  const back = Math.min(260, d * 0.24);
  const n = Math.max(1, Math.round(w / 1100));
  const gap = 12;
  const cw = (w - (n - 1) * gap) / n;
  const parts: LocalBox[] = [
    soft(-w / 2 + 60, w / 2 - 60, 0, plinth, -d / 2 + 40, d / 2 - 60, 8, { color: PART_COLORS.oak, shade: 0.7, finish: "wood" }),
    soft(-w / 2, w / 2, plinth, seatTop - 150, -d / 2, d / 2, 30, { shade: 0.86, finish: "velvet" }),
    soft(-w / 2, w / 2, plinth, h - 140, -d / 2, -d / 2 + back * 0.6, 60, { shade: 0.9, finish: "velvet" }),
  ];
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + i * (cw + gap);
    parts.push(soft(x0, x0 + cw, seatTop - 165, seatTop, -d / 2 + back * 0.55, d / 2, 70, { shade: 1.06, finish: "velvet" }));
    parts.push(soft(x0 + 15, x0 + cw - 15, seatTop - 30, h, -d / 2 + 5, -d / 2 + back, 110, { shade: 0.98, finish: "velvet" }));
  }
  const pillows: [number, number, string][] = [
    [-w / 2 + 120, 520, PART_COLORS.linen],
    [-w * 0.12, 500, PART_COLORS.throw],
    [w * 0.06, 520, PART_COLORS.pillow],
    [w / 2 - 640, 520, "#d9d6d0"],
  ];
  for (const [x0, pw, color] of pillows) {
    if (x0 + pw > w / 2 - 20) continue;
    parts.push(soft(x0, x0 + pw, seatTop - 10, Math.min(seatTop + 420, h), -d / 2 + back - 20, -d / 2 + back + 150, 110, { color, finish: "linen" }));
  }
  return parts;
}

function bed(w: number, d: number, h: number): LocalBox[] {
  const frameTop = Math.max(200, h - 220);
  const head = 90;
  const z0 = -d / 2 + head;
  return [
    soft(-w / 2, w / 2, 50, frameTop, -d / 2, d / 2, 35, { shade: 0.82, finish: "linen" }),
    ...legs(w, d, 60, 40, 55, PART_COLORS.walnut),
    soft(-w / 2 - 20, w / 2 + 20, 0, h + 550, -d / 2, z0, 45, { shade: 0.92, finish: "linen" }),
    soft(-w / 2 + 25, w / 2 - 25, frameTop - 10, h, z0 + 5, d / 2 - 20, 70, { color: PART_COLORS.linen, finish: "linen" }),
    soft(-w / 2 + 5, w / 2 - 5, h - 90, h + 50, z0 + d * 0.27, d / 2 - 5, 60, { color: PART_COLORS.linen, shade: 0.97, finish: "linen" }),
    soft(-w / 2 + 70, -20, h - 20, h + 150, z0 + 50, z0 + 50 + Math.min(430, d * 0.2), 75, { color: PART_COLORS.pillow, finish: "linen" }),
    soft(20, w / 2 - 70, h - 20, h + 150, z0 + 50, z0 + 50 + Math.min(430, d * 0.2), 75, { color: PART_COLORS.pillow, finish: "linen" }),
    soft(-w / 2, w / 2, h + 30, h + 62, d / 2 - 540, d / 2 - 120, 14, { color: PART_COLORS.throw, finish: "linen" }),
  ];
}

function table(kind: string, w: number, d: number, h: number): LocalBox[] {
  const top = kind === "coffee-table" ? 45 : 38;
  const legColor = kind === "desk" ? PART_COLORS.blackMetal : kind === "coffee-table" ? PART_COLORS.brass : PART_COLORS.walnut;
  const legFinish: PartFinish = kind === "desk" ? "metal" : kind === "coffee-table" ? "brass" : "wood";
  const legSize = kind === "desk" ? 32 : kind === "coffee-table" ? 30 : 60;
  const parts: LocalBox[] = [
    soft(-w / 2, w / 2, h - top, h, -d / 2, d / 2, kind === "coffee-table" ? Math.min(w, d) * 0.12 : 12, { finish: "wood" }),
    ...legs(w, d, h - top, kind === "coffee-table" ? 40 : 55, legSize, legColor, legFinish),
  ];
  if (kind === "coffee-table") parts.push(soft(-w / 2 + 50, w / 2 - 50, 110, 132, -d / 2 + 50, d / 2 - 50, 40, { shade: 0.85, finish: "wood" }));
  if (kind === "desk") {
    const x1 = w / 2 - 60;
    const x0 = Math.max(-w / 2 + 60, x1 - 420);
    parts.push(soft(x0, x1, h - top - 160, h - top, -d / 2 + 40, d / 2 - 30, 8, { shade: 0.9, finish: "wood" }));
    parts.push(soft((x0 + x1) / 2 - 70, (x0 + x1) / 2 + 70, h - top - 95, h - top - 80, d / 2 - 30, d / 2 - 15, 6, { color: PART_COLORS.brass, finish: "brass" }));
  }
  return parts;
}

function chair(w: number, d: number, h: number): LocalBox[] {
  const seat = Math.min(470, h * 0.52);
  return [
    ...legs(w, d, seat - 40, 20, 34, PART_COLORS.walnut),
    soft(-w / 2, w / 2, seat - 45, seat - 12, -d / 2, d / 2, 14, { color: PART_COLORS.walnut, finish: "wood" }),
    soft(-w / 2 + 12, w / 2 - 12, seat - 20, seat + 30, -d / 2 + 30, d / 2 - 5, 25, { shade: 1.05, finish: "linen" }),
    cyl(-w / 2 + 37, -d / 2 + 17, 30, 30, seat - 12, h - 20, { color: PART_COLORS.walnut, finish: "wood" }),
    cyl(w / 2 - 37, -d / 2 + 17, 30, 30, seat - 12, h - 20, { color: PART_COLORS.walnut, finish: "wood" }),
    soft(-w / 2 + 10, w / 2 - 10, h - 280, h, -d / 2, -d / 2 + 45, 22, { finish: "linen" }),
  ];
}

function wardrobe(w: number, d: number, h: number): LocalBox[] {
  const plinth = 70;
  const n = Math.max(2, Math.round(w / 500));
  const gap = 5;
  const doorW = (w - 20 - (n - 1) * gap) / n;
  const parts: LocalBox[] = [
    box(-w / 2 + 20, w / 2 - 20, 0, plinth, -d / 2 + 20, d / 2 - 40, { color: PART_COLORS.walnut, finish: "wood" }),
    soft(-w / 2, w / 2, plinth, h, -d / 2, d / 2 - 22, 8, { shade: 0.9, finish: "lacquer" }),
  ];
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + 10 + i * (doorW + gap);
    parts.push(soft(x0, x0 + doorW, plinth + 8, h - 8, d / 2 - 24, d / 2 - 2, 6, { finish: "lacquer" }));
    const hx = i % 2 === 0 ? x0 + doorW - 38 : x0 + 38;
    parts.push(cyl(hx, d / 2 + 9, 14, 14, h * 0.42, h * 0.62, { color: PART_COLORS.brass, finish: "brass" }));
  }
  return parts;
}

function bookcase(w: number, d: number, h: number): LocalBox[] {
  const t = 22;
  const parts: LocalBox[] = [
    box(-w / 2, w / 2, 0, h, -d / 2, -d / 2 + 12, { shade: 0.78, finish: "wood" }),
    soft(-w / 2, -w / 2 + t, 0, h, -d / 2, d / 2, 4, { finish: "wood" }),
    soft(w / 2 - t, w / 2, 0, h, -d / 2, d / 2, 4, { finish: "wood" }),
    soft(-w / 2, w / 2, h - t, h, -d / 2, d / 2, 4, { finish: "wood" }),
    box(-w / 2 + t, w / 2 - t, 0, 60, -d / 2, d / 2, { shade: 0.85, finish: "wood" }),
  ];
  const shelves = Math.max(2, Math.round(h / 380));
  const spacing = (h - 60 - t) / shelves;
  const rnd = seeded(Math.round(w * 7 + h * 3 + d));
  for (let s = 0; s < shelves; s++) {
    const y0 = 60 + s * spacing;
    if (s > 0) parts.push(soft(-w / 2 + t, w / 2 - t, y0 - t / 2, y0 + t / 2, -d / 2 + 12, d / 2, 3, { finish: "wood" }));
    let x = -w / 2 + t + 10 + rnd() * 40;
    const end = w / 2 - t - 10;
    while (x < end - 50) {
      const groupW = Math.min(end - x, 60 + rnd() * 110);
      if (rnd() < 0.15 && groupW > 120) {
        // Decoratief bolletje of vaasje in plaats van boeken
        const dia = Math.min(groupW * 0.8, spacing * 0.45, d * 0.6);
        parts.push(ball(x + groupW / 2, y0 + t / 2 + dia / 2, 0, dia, dia, dia, { color: PART_COLORS.ceramic, finish: "ceramic" }));
      } else {
        const bookH = spacing * (0.62 + rnd() * 0.25);
        parts.push(soft(x, x + groupW, y0 + t / 2, y0 + t / 2 + bookH, -d / 2 + 30, d / 2 - 25, 3, { color: BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)]!, finish: "paper" }));
      }
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
    box(-w / 2, w / 2, 0, plinth, -d / 2, front - 60, { color: PART_COLORS.blackMetal, finish: "matte" }),
    box(-w / 2, w / 2, plinth, h - counter, -d / 2, front - 18, { shade: 0.9, finish: "lacquer" }),
    soft(-w / 2 - 10, w / 2 + 10, h - counter, h, -d / 2, d / 2, 6, { color: PART_COLORS.stone, finish: "stone" }),
  ];
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + i * (doorW + gap);
    parts.push(soft(x0, x0 + doorW, plinth + 5, h - counter - 5, front - 18, front, 4, { finish: "lacquer" }));
    parts.push(soft(x0 + doorW / 2 - 110, x0 + doorW / 2 + 110, h - counter - 72, h - counter - 58, front, front + 14, 6, { color: PART_COLORS.brass, finish: "brass" }));
  }
  const sinkX = -w / 2 + w * 0.68;
  parts.push(soft(sinkX - 260, sinkX + 260, h - 4, h + 2, -d / 2 + 110, d / 2 - 90, 30, { color: PART_COLORS.steel, finish: "metal" }));
  parts.push(cyl(sinkX, -d / 2 + 55, 30, 30, h, h + 300, { color: PART_COLORS.brass, finish: "brass" }));
  parts.push(soft(sinkX - 15, sinkX + 15, h + 270, h + 300, -d / 2 + 55, -d / 2 + 230, 14, { color: PART_COLORS.brass, finish: "brass" }));
  const cookX = -w / 2 + w * 0.25;
  if (w > 1500) parts.push(soft(cookX - 300, cookX + 300, h, h + 6, -d / 2 + 70, d / 2 - 70, 10, { color: PART_COLORS.cooktop, finish: "glass" }));
  return parts;
}

function vanity(w: number, d: number, h: number): LocalBox[] {
  const top = 25;
  const base = 220;
  return [
    soft(-w / 2, w / 2, base, h - top, -d / 2, d / 2 - 20, 6, { shade: 0.92, finish: "wood" }),
    soft(-w / 2 + 6, w / 2 - 6, base + 6, (base + h - top) / 2 - 3, d / 2 - 20, d / 2 - 2, 4, { finish: "wood" }),
    soft(-w / 2 + 6, w / 2 - 6, (base + h - top) / 2 + 3, h - top - 6, d / 2 - 20, d / 2 - 2, 4, { finish: "wood" }),
    soft(-60, 60, (base + h - top) / 2 + 40, (base + h - top) / 2 + 52, d / 2 - 2, d / 2 + 12, 5, { color: PART_COLORS.brass, finish: "brass" }),
    soft(-w / 2, w / 2, h - top, h, -d / 2, d / 2, 6, { color: PART_COLORS.stone, finish: "stone" }),
    cyl(0, 10, w * 0.48, d * 0.62, h, h + 130, { color: PART_COLORS.porcelain, finish: "ceramic", taper: 1.12 }),
    cyl(0, -d / 2 + 40, 30, 30, h, h + 260, { color: PART_COLORS.brass, finish: "brass" }),
  ];
}

function sideTable(w: number, d: number, h: number): LocalBox[] {
  const top = 30;
  return [
    cyl(0, 0, w, d, h - top, h, { finish: "metal" }),
    // Iets smallere onderrand onder het blad
    cyl(0, 0, w * 0.96, d * 0.96, h - top - 8, h - top, { finish: "metal", shade: 0.85 }),
    // Drie gebogen poten (benaderd met taps toelopende staanders)
    cyl(-w * 0.3, -d * 0.12, 26, 26, 0, h - top - 8, { finish: "metal", taper: 1.6 }),
    cyl(w * 0.3, -d * 0.12, 26, 26, 0, h - top - 8, { finish: "metal", taper: 1.6 }),
    cyl(0, d * 0.32, 26, 26, 0, h - top - 8, { finish: "metal", taper: 1.6 }),
  ];
}

function floorLamp(w: number, d: number, h: number): LocalBox[] {
  const shadeH = Math.min(300, h * 0.2);
  return [
    cyl(0, 0, w * 0.7, d * 0.7, 0, 28, { color: PART_COLORS.blackMetal, finish: "metal" }),
    cyl(0, 0, 22, 22, 28, h - shadeH + 40, { color: PART_COLORS.brass, finish: "brass" }),
    cyl(0, 0, w * 0.82, d * 0.82, h - shadeH, h, { finish: "linen", taper: 0.86 }),
    cyl(0, 0, w * 0.7, d * 0.7, h - shadeH - 6, h - shadeH, { color: PART_COLORS.shadeGlow, finish: "light" }),
  ];
}

function vase(w: number, d: number, h: number): LocalBox[] {
  const vaseH = Math.min(520, h * 0.42);
  const parts: LocalBox[] = [
    cyl(0, 0, w * 0.5, d * 0.5, 0, vaseH * 0.15, { finish: "ceramic", taper: 1.3 }),
    ball(0, vaseH * 0.45, 0, w * 0.86, vaseH * 0.8, d * 0.86, { finish: "ceramic" }),
    cyl(0, 0, w * 0.36, d * 0.36, vaseH * 0.7, vaseH, { finish: "ceramic", taper: 1.15 }),
  ];
  const rnd = seeded(Math.round(w * 13 + h));
  for (let i = 0; i < 16; i++) {
    const spread = 0.25 + rnd() * 0.55;
    const x = (rnd() - 0.5) * w * spread;
    const z = (rnd() - 0.5) * d * spread;
    const top = vaseH + (h - vaseH) * (0.45 + rnd() * 0.55);
    parts.push(cyl(x, z, 7, 7, vaseH - 30, top - 8, { color: PART_COLORS.branch, finish: "wood", taper: 0.5 }));
    if (i % 2 === 0) {
      const dia = 16 + rnd() * 12;
      parts.push(ball(x, top - dia / 2, z, dia, dia, dia, { color: i % 4 === 0 ? "#c0703a" : PART_COLORS.throw, finish: "paper" }));
    }
  }
  return parts;
}

/** Kunstwerk aan de muur: lijst in ivoor, doek in de basiskleur met een lichter figuratief vlak. */
function art(w: number, d: number, h: number): LocalBox[] {
  const border = Math.min(70, w * 0.06);
  return [
    soft(-w / 2, w / 2, 0, h, -d / 2, d / 2 - 12, 4, { color: PART_COLORS.canvas, finish: "paper" }),
    box(-w / 2 + border, w / 2 - border, border, h - border, d / 2 - 12, d / 2 - 4, { finish: "matte" }),
    ball(0, h * 0.68, d / 2 - 4, w * 0.2, h * 0.17, 6, { color: "#8a7a68", finish: "matte" }),
    soft(-w * 0.24, w * 0.24, h * 0.1, h * 0.6, d / 2 - 4, d / 2, w * 0.1, { color: "#d9d1c3", finish: "matte" }),
  ];
}

/** Gordijn met ronde plooien en een zwarte roede. */
function curtain(w: number, d: number, h: number): LocalBox[] {
  const n = Math.max(3, Math.round(w / 95));
  const pw = w / n;
  const parts: LocalBox[] = [soft(-w / 2, w / 2, h - 28, h, -d / 2, -d / 2 + 28, 12, { color: PART_COLORS.blackMetal, finish: "metal" })];
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (i + 0.5) * pw;
    const deep = i % 2 === 0;
    parts.push(cyl(x, deep ? 0 : -d * 0.12, pw * 1.25, deep ? d * 0.9 : d * 0.6, 10, h - 28, { finish: "linen", shade: deep ? 1.02 : 0.92 }));
  }
  return parts;
}

function rug(w: number, d: number, h: number): LocalBox[] {
  return [soft(-w / 2, w / 2, 0, h, -d / 2, d / 2, 5, { finish: "fabric" }), soft(-w / 2 + 70, w / 2 - 70, h - 1, h + 0.5, -d / 2 + 70, d / 2 - 70, 3, { finish: "fabric", shade: 1.08 })];
}

/** Plant in een pot (terugvalvorm als het 3D-model niet laadt). */
function plant(w: number, d: number, h: number): LocalBox[] {
  const potH = h * 0.32;
  return [
    cyl(0, 0, w * 0.5, d * 0.5, 0, potH, { color: "#d8d2c8", finish: "ceramic", taper: 1.2 }),
    ball(0, potH + (h - potH) * 0.5, 0, w, h - potH, d, { finish: "matte" }),
  ];
}

/** Kleine vaas met bloemen (terugvalvorm). */
function smallVase(w: number, d: number, h: number): LocalBox[] {
  return [cyl(0, 0, w * 0.7, d * 0.7, 0, h * 0.5, { color: "#dfe8e6", finish: "glass" }), ball(0, h * 0.75, 0, w, h * 0.5, d, { color: "#e3b7a0", finish: "matte" })];
}

export function furnitureParts(kind: string, w: number, d: number, h: number): LocalBox[] {
  switch (kind) {
    case "sofa":
      return sofa(w, d, h);
    case "armchair":
      return armchair(w, d, h);
    case "lounge-sofa":
      return loungeSofa(w, d, h);
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
    case "side-table":
      return sideTable(w, d, h);
    case "floor-lamp":
      return floorLamp(w, d, h);
    case "vase":
      return vase(w, d, h);
    case "art":
      return art(w, d, h);
    case "curtain":
      return curtain(w, d, h);
    case "rug":
      return rug(w, d, h);
    case "plant":
      return plant(w, d, h);
    case "vase-small":
      return smallVase(w, d, h);
    default:
      return [soft(-w / 2, w / 2, 0, h, -d / 2, d / 2, Math.min(20, w / 4, d / 4, h / 4))];
  }
}
