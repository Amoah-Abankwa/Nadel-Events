/**
 * Single source for account and policy pages. The main shop hosts them once; the cake shop
 * and decoration studio link here, so customers always see the same sign-in and the same policies.
 */
export const AUTH_ROUTES = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  account: '/account/orders',
} as const;

export function loginHref(next?: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? `${AUTH_ROUTES.login}?next=${encodeURIComponent(next)}` : AUTH_ROUTES.login;
}

export const POLICY_LINKS = [
  { href: '/delivery', label: 'Delivery and pickup' },
  { href: '/returns', label: 'Returns and refunds' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms and conditions' },
] as const;

export const SUPPORT_LINKS = [
  { href: '/contact', label: 'Contact us' },
  { href: '/sitemap', label: 'Site map' },
] as const;
