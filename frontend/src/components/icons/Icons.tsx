import { DEPARTMENTS } from '@/lib/departments';

/** Small line icons (stroke = currentColor). Decorative unless a title is given. */
type P = { className?: string; title?: string };

function Svg({ className = 'size-5', title, children }: P & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export const IconSearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Svg>;
export const IconBag = (p: P) => <Svg {...p}><path d="M5 8h14l-1.2 12H6.2z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Svg>;
export const IconHeart = (p: P) => <Svg {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></Svg>;
export const IconUser = (p: P) => <Svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></Svg>;
export const IconMenu = (p: P) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>;
export const IconChevronDown = (p: P) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const IconChevronLeft = (p: P) => <Svg {...p}><path d="m15 6-6 6 6 6" /></Svg>;
export const IconChevronRight = (p: P) => <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>;
export const IconArrowUp = (p: P) => <Svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>;
export const IconPlus = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconCart = (p: P) => <Svg {...p}><path d="M3 4h2l2.2 10.5h10.6L20 7H7" /><circle cx="9.5" cy="19" r="1.3" /><circle cx="17" cy="19" r="1.3" /></Svg>;
export const IconOptions = (p: P) => <Svg {...p}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></Svg>;
export const IconPin = (p: P) => <Svg {...p}><path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></Svg>;
export const IconMail = (p: P) => <Svg {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><path d="m4 7 8 6 8-6" /></Svg>;
export const IconPhone = (p: P) => <Svg {...p}><path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" /></Svg>;
export const IconClock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>;
export const IconTruck = (p: P) => <Svg {...p}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17.5" cy="17.5" r="1.6" /></Svg>;
export const IconWallet = (p: P) => <Svg {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 14.5h2" /></Svg>;
export const IconStore = (p: P) => <Svg {...p}><path d="M4 10v10h16V10M3 6l2-3h14l2 3v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" /><path d="M10 20v-5h4v5" /></Svg>;
export const IconReturn = (p: P) => <Svg {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></Svg>;
export const IconSparkle = (p: P) => <Svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></Svg>;

// ---- category icons ----
export const IconCake = (p: P) => <Svg {...p}><path d="M4 20h16M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6" /><path d="M5 15.5c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0" /><path d="M12 12V8.5M12 6.5c-.8-.9-.8-1.9 0-3 .8 1.1.8 2.1 0 3z" /></Svg>;
export const IconWhisk = (p: P) => <Svg {...p}><path d="M14 10 21 3" /><path d="M14 10c-3.5-1-8 3-9 7s1 4 4 2 6.5-6 5-9z" /><path d="M14 10c-2 0-6 4.5-6.5 7.5" /></Svg>;
export const IconPot = (p: P) => <Svg {...p}><path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" /><path d="M2 10h2M20 10h2M9 10V8.5a3 3 0 0 1 6 0V10" /></Svg>;
export const IconSpoon = (p: P) => <Svg {...p}><ellipse cx="8" cy="7" rx="3" ry="4" /><path d="M9.5 10.5 19 20" /><path d="M15 4v6M17 4v6M19 4v6M17 10v10" /></Svg>;
export const IconBalloon = (p: P) => <Svg {...p}><path d="M12 15c3.3 0 5.5-3 5.5-6.2S15 3 12 3 6.5 5.6 6.5 8.8 8.7 15 12 15z" /><path d="m11 15 1 1.5 1-1.5M12 16.5c0 2-2 2.5-2 4.5" /></Svg>;
export const IconGrid = (p: P) => <Svg {...p}><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" /></Svg>;

/** Picks a category icon from its slug, so new categories get a sensible icon automatically. */
export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const s = slug.toLowerCase();
  if (DEPARTMENTS.cakes.match.test(s) || /bread|dessert|cupcake/.test(s)) return <IconCake className={className} />;
  if (DEPARTMENTS.decor.match.test(s) || /balloon|topper|event/.test(s)) return <IconBalloon className={className} />;
  if (/bak|whisk|mould|mold|pan-|piping/.test(s)) return <IconWhisk className={className} />;
  if (/utensil|cooking|spoon|tool|cutlery/.test(s)) return <IconSpoon className={className} />;
  if (/kitchen|cookware|pot|pan|appliance/.test(s)) return <IconPot className={className} />;
  return <IconGrid className={className} />;
}
