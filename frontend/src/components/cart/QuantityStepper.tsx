'use client';

export function QuantityStepper({ value, max, onChange, label }: { value: number; max: number; onChange: (n: number) => void; label: string }) {
  const btn = 'flex size-11 items-center justify-center text-lg hover:bg-flour disabled:opacity-40';
  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-sm border border-crust bg-paper">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">−</button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= 1) onChange(Math.min(n, max));
        }}
        aria-label="Quantity"
        className="h-11 w-12 border-x border-crust bg-transparent text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">+</button>
    </div>
  );
}
