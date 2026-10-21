export function StockBadge({ inStock, lowStock = false }: { inStock: boolean; lowStock?: boolean }) {
  if (!inStock) return <span className="text-sm font-semibold text-danger">Out of stock</span>;
  if (lowStock) return <span className="text-sm font-semibold text-cocoa">Only a few left</span>;
  return <span className="text-sm text-success">In stock</span>;
}
