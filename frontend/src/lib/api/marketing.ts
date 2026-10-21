import { api } from './client';
import type { ProductCard } from '../types';

export const PLACEMENTS = [
  { value: 'decor.hero', label: 'Decoration studio, main photo, /decor (1 image; 1300×900 px)' },
  { value: 'decor.feature', label: 'Decoration studio, story photo (1 image; 1240×880 px)' },
  { value: 'cakes.hero', label: 'Cake shop slider, /cakes (up to 5; 1920×800 px, phone 1200×1000)' },
  { value: 'home.hero', label: 'Home page slider (up to 5; 1500×700 px, phone 1200×900)' },
  { value: 'home.promo', label: 'Home page, two banners under the slider (850×500 px)' },
  { value: 'home.feature', label: 'Home page, wide banner mid-page (1800×500 px)' },
  { value: 'home.sidebar', label: 'Home page, tall banner in the left column (600×800 px)' },
  { value: 'home.strip', label: 'Thin strip (1600×200 px)' },
  { value: 'category.top', label: 'Top of every category page' },
  { value: 'product.below', label: 'Product pages, below reviews' },
] as const;

export interface PublicBanner {
  id: string;
  title: string;
  desktopImage: string;
  mobileImage: string | null;
  altText: string;
  destinationUrl: string;
  isSponsored: boolean;
}

export interface CampaignPage {
  slug: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  headline: string;
  body: string;
  heroImage: string | null;
  couponCode: string | null;
  products: ProductCard[];
}

export interface PublicGiveaway {
  slug: string;
  title: string;
  prize: string;
  description: string;
  imageUrl: string | null;
  opensAt: string;
  closesAt: string;
  state: 'UPCOMING' | 'OPEN' | 'CLOSED';
  winner: string | null;
  rules?: string;
  entryLimit?: number;
  myEntries?: number;
  isWinner?: boolean;
}

export interface AdminBanner extends PublicBanner {
  placement: string;
  priority: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  startsAt: string | null;
  endsAt: string | null;
  clicks: number;
  campaignId: string | null;
  campaign?: { name: string } | null;
}

export interface AdminCampaign {
  id: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  startsAt: string | null;
  endsAt: string | null;
  content: { headline: string; body: string; heroImage: string | null; productIds: string[]; couponCode: string | null };
}

export interface AdminGiveaway {
  id: string;
  slug: string;
  title: string;
  prize: string;
  description: string;
  imageUrl: string | null;
  rules: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  opensAt: string;
  closesAt: string;
  entryLimit: number;
  entries: number;
  entrants: number;
  winnerDisplayName: string | null;
  winnerDrawnAt: string | null;
  winner: { id: string; name: string; email: string; phone: string | null } | null;
}

const d = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const marketingApi = {
  giveaway: (slug: string) => d(api.get<PublicGiveaway>(`/giveaways/${encodeURIComponent(slug)}`)),
  enter: (slug: string) => d(api.post<{ myEntries: number; entryLimit: number }>(`/giveaways/${encodeURIComponent(slug)}/enter`, { acceptRules: true })),

  banners: () => d(api.get<AdminBanner[]>('/admin/banners')),
  saveBanner: (id: string | null, body: unknown) => d(id ? api.patch(`/admin/banners/${id}`, body) : api.post('/admin/banners', body)),
  campaigns: () => d(api.get<AdminCampaign[]>('/admin/campaigns')),
  saveCampaign: (id: string | null, body: unknown) => d(id ? api.patch(`/admin/campaigns/${id}`, body) : api.post('/admin/campaigns', body)),
  giveaways: () => d(api.get<AdminGiveaway[]>('/admin/giveaways')),
  saveGiveaway: (id: string | null, body: unknown) => d(id ? api.patch(`/admin/giveaways/${id}`, body) : api.post('/admin/giveaways', body)),
  draw: (id: string) => d(api.post<{ winner: { name: string; email: string; phone: string | null; displayName: string }; poolSize: number }>(`/admin/giveaways/${id}/draw`)),
  redraw: (id: string, reason: string) => d(api.post<{ winner: { name: string; email: string; phone: string | null; displayName: string }; poolSize: number }>(`/admin/giveaways/${id}/redraw`, { reason })),
};
