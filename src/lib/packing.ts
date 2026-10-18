export type Sku = {
  sku: string;
  name: string;
  l: number;
  w: number;
  h: number;
  fragile: boolean;
  tone: "copper" | "sage" | "ink" | "paper";
};

export const SKUS: Sku[] = [
  { sku: "MR-1042", name: "Camel overcoat", l: 42, w: 32, h: 8, fragile: false, tone: "copper" },
  { sku: "MR-2210", name: "Ink merino knit", l: 28, w: 22, h: 6, fragile: false, tone: "ink" },
  { sku: "MR-0881", name: "Ivory shirt", l: 30, w: 24, h: 4, fragile: false, tone: "paper" },
  { sku: "MR-3304", name: "Sage trouser", l: 36, w: 26, h: 5, fragile: false, tone: "sage" },
  { sku: "MR-5519", name: "Tan loafer pair", l: 32, w: 18, h: 12, fragile: false, tone: "copper" },
  { sku: "MR-6702", name: "Forest tote", l: 38, w: 16, h: 28, fragile: false, tone: "sage" },
  { sku: "MR-9011", name: "Ceramic pourer", l: 12, w: 12, h: 18, fragile: true, tone: "paper" },
  { sku: "MR-1188", name: "Silk scarf", l: 20, w: 16, h: 2, fragile: false, tone: "copper" },
];

export type LineItem = Sku & { qty: number; verified: boolean };

export type Placement = {
  sku: string;
  name: string;
  x: number;
  y: number;
  l: number;
  w: number;
  fragile: boolean;
  tone: Sku["tone"];
};

export type Carton = {
  id: string;
  L: number;
  W: number;
  H: number;
  placements: Placement[];
  usedVolume: number;
  boxVolume: number;
};

const BOXES = [
  { L: 30, W: 22, H: 12 },
  { L: 40, W: 30, H: 16 },
  { L: 50, W: 36, H: 22 },
  { L: 60, W: 40, H: 30 },
];

function volume(l: number, w: number, h: number) {
  return l * w * h;
}

/** Shelf pack in the footprint, then pick the smallest carton that fits height. */
export function packOrder(items: LineItem[]): {
  cartons: Carton[];
  wasteRatio: number;
  dimWeight: number;
  verified: number;
  total: number;
} {
  const units: Sku[] = [];
  for (const item of items) {
    for (let i = 0; i < item.qty; i += 1) units.push(item);
  }
  units.sort((a, b) => b.l * b.w - a.l * a.w);

  const shelves: { y: number; height: number; x: number; pieces: Placement[]; maxH: number }[] = [];
  let cursorY = 0;
  let maxX = 0;

  for (const unit of units) {
    let placed = false;
    for (const shelf of shelves) {
      if (unit.w <= shelf.height && shelf.x + unit.l <= 60 && unit.h <= 30) {
        shelf.pieces.push({
          sku: unit.sku,
          name: unit.name,
          x: shelf.x,
          y: shelf.y,
          l: unit.l,
          w: unit.w,
          fragile: unit.fragile,
          tone: unit.tone,
        });
        shelf.x += unit.l;
        shelf.maxH = Math.max(shelf.maxH, unit.h);
        maxX = Math.max(maxX, shelf.x);
        placed = true;
        break;
      }
    }
    if (!placed) {
      const height = unit.w;
      shelves.push({
        y: cursorY,
        height,
        x: unit.l,
        maxH: unit.h,
        pieces: [
          {
            sku: unit.sku,
            name: unit.name,
            x: 0,
            y: cursorY,
            l: unit.l,
            w: unit.w,
            fragile: unit.fragile,
            tone: unit.tone,
          },
        ],
      });
      cursorY += height;
      maxX = Math.max(maxX, unit.l);
    }
  }

  const needL = Math.max(20, maxX);
  const needW = Math.max(16, cursorY);
  const needH = Math.max(8, ...shelves.map((s) => s.maxH), 8);
  const box =
    BOXES.find((b) => b.L >= needL && b.W >= needW && b.H >= needH) ??
    BOXES[BOXES.length - 1];

  const placements = shelves.flatMap((s) => s.pieces);
  const usedVolume = units.reduce((sum, u) => sum + volume(u.l, u.w, u.h), 0);
  const boxVolume = volume(box.L, box.W, box.H);
  const carton: Carton = {
    id: "CTN-1",
    L: box.L,
    W: box.W,
    H: box.H,
    placements,
    usedVolume,
    boxVolume,
  };
  const wasteRatio = 1 - usedVolume / boxVolume;
  const dimWeight = (box.L * box.W * box.H) / 5000;
  const verified = items.filter((i) => i.verified).length;
  return {
    cartons: [carton],
    wasteRatio,
    dimWeight,
    verified,
    total: items.length,
  };
}

export function makeOrder(seed: number): LineItem[] {
  const picks = [0, 1, 3, 4, 6, 7].map((offset) => SKUS[(seed + offset) % SKUS.length]);
  const unique = new Map<string, LineItem>();
  for (const sku of picks) {
    const prev = unique.get(sku.sku);
    if (prev) prev.qty += 1;
    else unique.set(sku.sku, { ...sku, qty: 1, verified: sku.sku !== "MR-9011" || seed % 5 !== 0 });
  }
  return [...unique.values()];
}
