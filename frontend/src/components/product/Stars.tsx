import { useId } from 'react';

const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z';

/**
 * Read-only star rating used by every section. Partial stars use a clip (no gradients).
 *  - "filled" (main shop, cakes): caramel stars on a light base
 *  - "outline" (decoration studio): thin outlined stars in the current text colour
 */
export function Stars({ value, count, size = 14, variant = 'filled', className = '' }: { value: number; count?: number; size?: number; variant?: 'filled' | 'outline'; className?: string }) {
  const id = useId();
  const label = `Rated ${value.toFixed(1)} out of 5${count != null ? `, ${count} review${count === 1 ? '' : 's'}` : ''}`;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} role="img" aria-label={label}>
      <span className={`inline-flex ${variant === 'outline' ? 'gap-1' : ''}`} aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, value - i + 1));
          return (
            <svg key={i} width={size} height={size} viewBox="0 0 24 24">
              <clipPath id={`${id}-${i}`}><rect x="0" y="0" width={24 * fill} height="24" /></clipPath>
              {variant === 'outline' ? (
                <>
                  <path d={STAR} fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d={STAR} fill="currentColor" clipPath={`url(#${id}-${i})`} />
                </>
              ) : (
                <>
                  <path d={STAR} fill="var(--color-crust)" />
                  <path d={STAR} fill="var(--color-caramel)" clipPath={`url(#${id}-${i})`} />
                </>
              )}
            </svg>
          );
        })}
      </span>
      {count != null && <span aria-hidden className="text-xs text-muted">({count})</span>}
    </span>
  );
}
