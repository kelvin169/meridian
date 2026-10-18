import type { Product } from "@/lib/catalog";

export function ProductSwatch({
  product,
  className = "",
}: {
  product: Pick<Product, "name" | "palette">;
  className?: string;
}) {
  const [a, b, c] = product.palette;
  const fill = (rgb: [number, number, number]) =>
    `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
  return (
    <svg
      viewBox="0 0 160 200"
      className={className}
      role="img"
      aria-label={product.name}
    >
      <rect width="160" height="200" fill={fill(a.rgb)} />
      <path d="M0 140 L160 90 L160 200 L0 200 Z" fill={fill(b.rgb)} opacity="0.9" />
      <rect x="18" y="28" width="70" height="8" fill={fill(c.rgb)} />
      <circle cx="118" cy="48" r="18" fill={fill(c.rgb)} />
      <path d="M24 78 h72" stroke={fill(b.rgb)} strokeWidth="3" />
    </svg>
  );
}
