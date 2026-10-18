import { useMemo, useRef, useState, type ReactNode } from "react";
import { Camera, Package, ScanLine, Upload } from "lucide-react";
import { catalog, completeTheLook, rankCatalog, type Product, type Ranked } from "@/lib/catalog";
import { featuresFromFile, histogramFromPalette, type Feature } from "@/lib/vision";
import { makeOrder, packOrder, type Carton, type LineItem } from "@/lib/packing";
import { ProductSwatch } from "@/components/product-swatch";

type Tab = "search" | "pack" | "notes";

const toneClass: Record<string, string> = {
  copper: "bg-copper text-paper",
  sage: "bg-sage text-paper",
  ink: "bg-ink text-paper",
  paper: "bg-paper-2 text-ink",
};

export function Lab() {
  const [tab, setTab] = useState<Tab>("search");
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-paper/70">
              Portfolio · computer vision
            </p>
            <h1 className="display text-3xl sm:text-4xl">Meridian</h1>
            <p className="mt-1 max-w-xl text-sm text-paper/80">
              Shop-by-image retrieval and a packing line that sizes cartons from item geometry.
              Both run locally on a small catalog — the same shape as a production pipeline.
            </p>
          </div>
          <nav className="flex gap-2" aria-label="Sections">
            <TabButton active={tab === "search"} onClick={() => setTab("search")} icon={<Camera size={16} />}>
              Visual search
            </TabButton>
            <TabButton active={tab === "pack"} onClick={() => setTab("pack")} icon={<Package size={16} />}>
              Pack line
            </TabButton>
            <TabButton active={tab === "notes"} onClick={() => setTab("notes")} icon={<ScanLine size={16} />}>
              Runbook
            </TabButton>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "search" && <SearchBench />}
        {tab === "pack" && <PackBench />}
        {tab === "notes" && <Runbook />}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium ${
        active ? "bg-copper text-paper" : "bg-paper/10 text-paper"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function SearchBench() {
  const [query, setQuery] = useState<Feature | null>(null);
  const [label, setLabel] = useState("No query yet");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const result = useMemo(() => (query ? rankCatalog(query) : null), [query]);
  const anchor = result?.ranked[0];
  const look = anchor ? completeTheLook(anchor) : [];

  function useProduct(product: Product) {
    setError("");
    setPreview(null);
    setLabel(product.name);
    setQuery(product.features);
  }

  async function onFile(file: File) {
    setError("");
    try {
      const features = await featuresFromFile(file);
      setQuery(features);
      setLabel(file.name);
      setPreview(URL.createObjectURL(file));
    } catch {
      setError("That file could not be read as an image.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="text-xl">Query</h2>
        <p className="mt-1 text-sm text-muted">
          Drop a photo or start from a catalog color. A 13-bin color histogram is the embedding.
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-4 flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-paper text-sm"
        >
          <Upload size={18} />
          Upload an image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
        {preview && (
          <img src={preview} alt="Uploaded query" className="mt-3 h-36 w-full rounded-lg object-cover" />
        )}
        <p className="mt-3 text-sm">
          Active: <span className="font-medium">{label}</span>
        </p>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <p className="mt-4 text-xs font-medium uppercase tracking-widest text-muted">Sample queries</p>
        <ul className="mt-2 flex flex-col gap-2">
          {catalog.slice(0, 6).map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => useProduct(product)}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-line bg-paper px-2 text-left text-sm"
              >
                <ProductSwatch product={product} className="h-10 w-8 shrink-0 rounded" />
                {product.name}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-3 min-h-11 text-sm text-copper-deep underline"
          onClick={() => {
            const rust = histogramFromPalette([
              { rgb: [210, 70, 40], weight: 0.7 },
              { rgb: [40, 20, 16], weight: 0.3 },
            ]);
            setPreview(null);
            setLabel("Synthetic rust swatch");
            setQuery(rust);
          }}
        >
          Or match a rust swatch
        </button>
      </section>

      <section>
        {!result && (
          <div className="rounded-lg border border-line bg-card p-8 text-muted">
            Choose a sample or upload a photo to rank the catalog.
          </div>
        )}
        {result && (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <Metric label="Query time" value={`${result.ms.toFixed(2)} ms`} hint="Target in prod: under 200 ms" />
              <Metric label="Top score" value={result.ranked[0] ? result.ranked[0].score.toFixed(3) : "—"} hint="Cosine on color embedding" />
              <Metric
                label="Strong matches"
                value={String(result.ranked.filter((r) => r.score > 0.92).length)}
                hint="Score above 0.92"
              />
            </div>
            <h2 className="text-xl">Nearest products</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {result.ranked.map((item, index) => (
                <ResultCard key={item.id} item={item} rank={index + 1} />
              ))}
            </ul>
            {anchor && (
              <div className="mt-6">
                <h2 className="text-xl">Complete the look</h2>
                <p className="text-sm text-muted">Same occasion, different category than {anchor.name}.</p>
                <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                  {look.map((item) => (
                    <li key={item.id} className="rounded-lg border border-line bg-card p-3">
                      <ProductSwatch product={item} className="h-28 w-full rounded" />
                      <p className="mt-2 text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted">
                        {item.category} · ${item.price}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function ResultCard({ item, rank }: { item: Ranked; rank: number }) {
  const pct = Math.round(item.score * 100);
  return (
    <li className="flex gap-3 rounded-lg border border-line bg-card p-3">
      <ProductSwatch product={item} className="h-24 w-20 shrink-0 rounded" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">#{rank}</p>
        <p className="font-medium">{item.name}</p>
        <p className="text-xs text-muted">
          {item.category} · ${item.price}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2">
          <div className="h-full bg-sage" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted">{pct}% similar</p>
      </div>
    </li>
  );
}

function PackBench() {
  const [seed, setSeed] = useState(1);
  const [seen, setSeen] = useState<Record<string, true>>({});
  const [replay, setReplay] = useState(false);
  const [ran, setRan] = useState(false);
  const order = useMemo(() => makeOrder(seed), [seed]);
  const packed = useMemo(() => (ran ? packOrder(order) : null), [ran, order]);
  const orderId = `ORD-${1000 + seed}`;

  function run() {
    if (seen[orderId]) {
      setReplay(true);
      setRan(true);
      return;
    }
    setSeen((prev) => ({ ...prev, [orderId]: true }));
    setReplay(false);
    setRan(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="text-xl">Order {orderId}</h2>
        <p className="mt-1 text-sm text-muted">
          Vision verifies SKU, then a shelf packer picks the smallest carton.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {order.map((item) => (
            <li key={item.sku} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {item.name}
                <span className="block text-xs text-muted">
                  {item.sku} · {item.l}×{item.w}×{item.h} cm
                  {item.fragile ? " · fragile" : ""}
                </span>
              </span>
              <span className={item.verified ? "text-sage" : "text-danger"}>
                {item.verified ? "OK" : "Hold"}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-2">
          <button type="button" onClick={run} className="min-h-11 rounded-full bg-ink px-4 text-sm text-paper">
            Pack this order
          </button>
          <button
            type="button"
            onClick={() => {
              setSeed((s) => s + 1);
              setRan(false);
              setReplay(false);
            }}
            className="min-h-11 rounded-full border border-line px-4 text-sm"
          >
            Next order
          </button>
        </div>
        {replay && (
          <p className="mt-3 text-sm text-sage">
            Idempotent replay: order {orderId} already packed. No second carton was cut.
          </p>
        )}
      </section>
      <section>
        {!packed && (
          <div className="rounded-lg border border-line bg-card p-8 text-muted">
            Run the packer to size a carton and place each SKU.
          </div>
        )}
        {packed && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Carton" value={`${packed.cartons[0].L}×${packed.cartons[0].W}×${packed.cartons[0].H}`} hint="cm, smallest fit" />
              <Metric label="Void" value={`${Math.round(packed.wasteRatio * 100)}%`} hint="Unused carton volume" />
              <Metric label="Dim weight" value={`${packed.dimWeight.toFixed(2)} kg`} hint="L×W×H / 5000" />
              <Metric
                label="SKU checks"
                value={`${packed.verified}/${packed.total}`}
                hint="Holds stay off the line"
              />
            </div>
            <CartonView carton={packed.cartons[0]} items={order} />
          </>
        )}
      </section>
    </div>
  );
}

function CartonView({ carton, items }: { carton: Carton; items: LineItem[] }) {
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <h2 className="text-xl">Footprint</h2>
      <p className="text-sm text-muted">Top-down shelf pack. Fragile pieces are outlined.</p>
      <div
        className="relative mt-4 w-full overflow-hidden rounded-lg border border-ink bg-paper-2"
        style={{ aspectRatio: `${carton.L} / ${carton.W}` }}
      >
        {carton.placements.map((p, i) => (
          <div
            key={`${p.sku}-${i}`}
            className={`absolute flex items-end overflow-hidden p-1 text-xs leading-tight ${toneClass[p.tone]} ${
              p.fragile ? "outline outline-2 outline-danger" : ""
            }`}
            style={{
              left: `${(p.x / carton.L) * 100}%`,
              top: `${(p.y / carton.W) * 100}%`,
              width: `${(p.l / carton.L) * 100}%`,
              height: `${(p.w / carton.W) * 100}%`,
            }}
            title={p.name}
          >
            {p.sku}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        {items.filter((i) => !i.verified).length
          ? "A held SKU is flagged before the carton is sealed."
          : "All SKUs verified before seal."}
      </p>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2">
      <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
      <p className="text-lg font-medium">{value}</p>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

function Runbook() {
  const steps = [
    ["Trigger", "Image upload or a tote scan starts one run with an idempotency key (order or query id)."],
    ["Embed", "Vision model writes a vector. Here that is a color histogram; production would be a ViT embedding in Qdrant or Milvus."],
    ["Act", "Search returns ranked SKUs, or the packer instructs a carton cutter and a pick arm."],
    ["Fail", "Unreadable images and failed SKU checks go to a hold queue with an alert. Retries do not double-pack."],
    ["Watch", "Latency, match score, void fill, and verification rate stay on the bench you just used."],
  ];
  return (
    <section className="max-w-3xl">
      <h2 className="text-2xl">How this maps to the role</h2>
      <p className="mt-2 text-sm text-muted">
        A hiring manager can click through both benches. The notes below are the handover you would leave with the system.
      </p>
      <ol className="mt-6 flex flex-col gap-3">
        {steps.map(([title, body], index) => (
          <li key={title} className="rounded-lg border border-line bg-card p-4">
            <p className="text-xs uppercase tracking-widest text-copper-deep">0{index + 1}</p>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
