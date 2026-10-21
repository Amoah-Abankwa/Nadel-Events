/** Hand-drawn-feeling shapes for the cake section, all as solid SVG (no gradients). */

/** A row of half-circles along an edge, like piped icing. `fill` is the colour of the section it bites into. */
export function ScallopEdge({ fill = 'var(--color-paper)', position = 'bottom', size = 38, className = '' }: { fill?: string; position?: 'top' | 'bottom'; size?: number; className?: string }) {
  const id = `sc-${position}-${size}`;
  return (
    <svg aria-hidden className={`block w-full ${className}`} height={size / 2} preserveAspectRatio="none">
      <defs>
        <pattern id={id} width={size} height={size / 2} patternUnits="userSpaceOnUse">
          <circle cx={size / 2} cy={position === 'bottom' ? size / 2 : 0} r={size / 2} fill={fill} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Points of a scalloped circle (a flower-like outline). */
function scallopPath(r: number, bumps: number, depth: number) {
  const pts: string[] = [];
  const steps = bumps * 8;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = r - depth + depth * Math.abs(Math.cos((a * bumps) / 2));
    pts.push(`${(r + rr * Math.cos(a)).toFixed(2)},${(r + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Scalloped disc, optionally drawn as an outline ring. */
export function ScallopDisc({ size, fill, ring, bumps = 14, children, className = '' }: { size: number; fill: string; ring?: string; bumps?: number; children?: React.ReactNode; className?: string }) {
  const r = size / 2;
  return (
    <span className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <path d={scallopPath(r, bumps, size * 0.035)} fill={ring ?? fill} />
        {ring && <path d={scallopPath(r, bumps, size * 0.035)} fill={fill} transform={`translate(${size * 0.03} ${size * 0.03}) scale(0.94)`} />}
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

/** Faint repeating stars and dots, used on the rose band. */
export function StarPattern({ color = 'rgb(255 255 255 / 0.12)' }: { color?: string }) {
  return (
    <svg aria-hidden className="absolute inset-0 size-full">
      <defs>
        <pattern id="stars" width="140" height="120" patternUnits="userSpaceOnUse">
          <path d="M30 18l4.5 9.5 10.5 1.5-7.6 7.3 1.8 10.4L30 41.8l-9.2 4.9 1.8-10.4-7.6-7.3 10.5-1.5z" fill="none" stroke={color} strokeWidth="2.5" />
          <path d="M105 70l3 6.4 7 .9-5.1 4.9 1.2 7L105 85.8l-6.1 3.4 1.2-7-5.1-4.9 7-.9z" fill={color} />
          <circle cx="90" cy="20" r="3" fill={color} />
          <circle cx="20" cy="95" r="4" fill="none" stroke={color} strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#stars)" />
    </svg>
  );
}

const S = 'none';
const stroke = { fill: S, stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const IconCupcake = ({ className = 'size-10' }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 48 48" className={className} {...stroke}>
    <path d="M12 26h24l-3 16H15z" /><path d="M18 26l1 16M24 26v16M30 26l-1 16" />
    <path d="M11 26c-2-6 3-10 8-9 1-5 9-6 11 0 5-1 9 4 7 9z" /><circle cx="27" cy="9" r="2.5" /><path d="M27 11.5c0 1.5-.5 3-1.5 4.5" />
  </svg>
);
export const IconTieredCake = ({ className = 'size-10' }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 48 48" className={className} {...stroke}>
    <path d="M8 42h32M10 42V31h28v11M14 31v-8h20v8M18 23v-6h12v6" /><path d="M10 35c3 2 5 2 7 0s5-2 7 0 5 2 7 0 5-2 7 0" /><path d="M24 17v-5M24 9c-1-1.2-1-2.6 0-4 1 1.4 1 2.8 0 4z" />
  </svg>
);
export const IconPartyHat = ({ className = 'size-10' }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 48 48" className={className} {...stroke}>
    <path d="M24 6 12 40h24z" /><path d="M16 28l14-6M14 34l18-7M19 19l9-4" /><circle cx="24" cy="5" r="2.5" /><path d="M10 40c4 2 24 2 28 0" />
  </svg>
);
export const IconDonut = ({ className = 'size-10' }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 48 48" className={className} {...stroke}>
    <ellipse cx="24" cy="26" rx="17" ry="12" /><ellipse cx="24" cy="25" rx="5" ry="3" /><path d="M8 24c3-4 6-2 9-4s6 1 9-1 7 0 9-1 4 2 6 4" /><path d="M16 17l1-2M30 16l1 2M22 33l-1 2M33 30l2 1" />
  </svg>
);
export const IconCroissant = ({ className = 'size-10' }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 48 48" className={className} {...stroke}>
    <path d="M6 30c2-10 10-16 18-16s16 6 18 16c-3 2-6 1-8-1-2 4-6 5-10 5s-8-1-10-5c-2 2-5 3-8 1z" /><path d="M16 29c1-5 3-9 8-11M32 29c-1-5-3-9-8-11M24 34V18" />
  </svg>
);

/** Small decorated divider under script headings. */
export function HeadingFlourish({ color = 'currentColor' }: { color?: string }) {
  return (
    <span aria-hidden className="mt-2 flex items-center justify-center gap-3" style={{ color }}>
      <span className="h-px w-12 bg-current opacity-40" />
      <IconCupcake className="size-9" />
      <span className="h-px w-12 bg-current opacity-40" />
    </span>
  );
}

export function ScriptHeading({ id, children, color = 'text-rose' }: { id: string; children: React.ReactNode; color?: string }) {
  return (
    <div className={`text-center ${color}`}>
      <h2 id={id} className="font-script text-5xl font-normal leading-none sm:text-6xl" style={{ color: 'inherit' }}>{children}</h2>
      <HeadingFlourish />
    </div>
  );
}
