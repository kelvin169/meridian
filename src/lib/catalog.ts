import { cosine, histogramFromPalette, type Feature } from "@/lib/vision";

export type Product = {
  id: string;
  name: string;
  category: string;
  look: string;
  price: number;
  palette: { rgb: [number, number, number]; weight: number }[];
  features: Feature;
};

const raw: Omit<Product, "features">[] = [
  {
    id: "coat-camel",
    name: "Camel overcoat",
    category: "Outerwear",
    look: "city",
    price: 248,
    palette: [
      { rgb: [184, 132, 78], weight: 0.62 },
      { rgb: [92, 64, 42], weight: 0.22 },
      { rgb: [236, 226, 208], weight: 0.16 },
    ],
  },
  {
    id: "knit-ink",
    name: "Ink merino knit",
    category: "Knitwear",
    look: "city",
    price: 128,
    palette: [
      { rgb: [28, 32, 42], weight: 0.7 },
      { rgb: [90, 96, 110], weight: 0.2 },
      { rgb: [210, 206, 198], weight: 0.1 },
    ],
  },
  {
    id: "shirt-ivory",
    name: "Ivory poplin shirt",
    category: "Shirting",
    look: "city",
    price: 86,
    palette: [
      { rgb: [242, 236, 224], weight: 0.75 },
      { rgb: [196, 176, 148], weight: 0.15 },
      { rgb: [90, 70, 50], weight: 0.1 },
    ],
  },
  {
    id: "trouser-sage",
    name: "Sage wool trouser",
    category: "Trousers",
    look: "city",
    price: 164,
    palette: [
      { rgb: [62, 102, 84], weight: 0.68 },
      { rgb: [28, 48, 40], weight: 0.2 },
      { rgb: [214, 208, 190], weight: 0.12 },
    ],
  },
  {
    id: "dress-clay",
    name: "Clay column dress",
    category: "Dresses",
    look: "evening",
    price: 196,
    palette: [
      { rgb: [176, 92, 68], weight: 0.64 },
      { rgb: [92, 36, 32], weight: 0.22 },
      { rgb: [232, 210, 188], weight: 0.14 },
    ],
  },
  {
    id: "scarf-rust",
    name: "Rust silk scarf",
    category: "Accessories",
    look: "evening",
    price: 64,
    palette: [
      { rgb: [176, 72, 36], weight: 0.55 },
      { rgb: [214, 150, 72], weight: 0.3 },
      { rgb: [48, 28, 22], weight: 0.15 },
    ],
  },
  {
    id: "loafer-tan",
    name: "Tan leather loafer",
    category: "Footwear",
    look: "city",
    price: 210,
    palette: [
      { rgb: [150, 96, 52], weight: 0.6 },
      { rgb: [48, 32, 22], weight: 0.28 },
      { rgb: [220, 200, 170], weight: 0.12 },
    ],
  },
  {
    id: "bag-forest",
    name: "Forest tote",
    category: "Accessories",
    look: "weekend",
    price: 178,
    palette: [
      { rgb: [36, 72, 56], weight: 0.62 },
      { rgb: [18, 36, 28], weight: 0.24 },
      { rgb: [196, 168, 110], weight: 0.14 },
    ],
  },
  {
    id: "tee-chalk",
    name: "Chalk heavy tee",
    category: "Knitwear",
    look: "weekend",
    price: 48,
    palette: [
      { rgb: [232, 228, 218], weight: 0.78 },
      { rgb: [160, 156, 146], weight: 0.14 },
      { rgb: [40, 40, 38], weight: 0.08 },
    ],
  },
  {
    id: "jacket-navy",
    name: "Navy field jacket",
    category: "Outerwear",
    look: "weekend",
    price: 228,
    palette: [
      { rgb: [28, 42, 68], weight: 0.66 },
      { rgb: [12, 18, 32], weight: 0.22 },
      { rgb: [186, 164, 110], weight: 0.12 },
    ],
  },
  {
    id: "skirt-black",
    name: "Black wrap skirt",
    category: "Trousers",
    look: "evening",
    price: 118,
    palette: [
      { rgb: [18, 18, 20], weight: 0.74 },
      { rgb: [64, 64, 68], weight: 0.16 },
      { rgb: [200, 186, 160], weight: 0.1 },
    ],
  },
  {
    id: "sneaker-cloud",
    name: "Cloud runner",
    category: "Footwear",
    look: "weekend",
    price: 142,
    palette: [
      { rgb: [236, 236, 232], weight: 0.5 },
      { rgb: [120, 128, 132], weight: 0.28 },
      { rgb: [196, 92, 48], weight: 0.22 },
    ],
  },
];

export const catalog: Product[] = raw.map((item) => ({
  ...item,
  features: histogramFromPalette(item.palette),
}));

export type Ranked = Product & { score: number };

export function rankCatalog(query: Feature, limit = 6): { ranked: Ranked[]; ms: number } {
  const t0 = performance.now();
  const ranked = catalog
    .map((product) => ({ ...product, score: cosine(query, product.features) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return { ranked, ms: performance.now() - t0 };
}

export function completeTheLook(anchor: Product): Product[] {
  return catalog
    .filter((p) => p.id !== anchor.id && (p.look === anchor.look || p.category !== anchor.category))
    .filter((p) => p.category !== anchor.category)
    .slice(0, 3);
}
