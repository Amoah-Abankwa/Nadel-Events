import { api } from './client';
import type { Paginated } from '../types';
import { signedUpload } from '../cloudinary';

// Shapes mirror the admin API (Prisma rows; Decimal fields arrive as strings).

export type Role = 'CUSTOMER' | 'FULFILMENT' | 'MARKETING' | 'ADMIN';

export interface Summary {
  paidOrdersToday: number;
  newRequests: number;
  pendingReviews: number;
  refundsStuck: number;
  newMessages: number;
  salesToday: string;
  pendingPayment: number;
  toFulfil: number;
  inProgress: number;
  needsReconciliation: number;
  lowStock: number;
  deadNotifications: number;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfilmentType: 'PICKUP' | 'DELIVERY';
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  taxLines: { name: string; ratePercent: string; amount: string }[] | null;
  pricesIncludeTax: boolean;
  deliveryFee: string;
  total: string;
  couponCode: string | null;
  deliveryZoneName: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  shippingAddress: { recipientName: string; phone: string; addressLine: string; region: string; area: string; city: string; deliveryInstructions?: string } | null;
  notes: string | null;
  needsReconciliation: boolean;
  serviceRequestId: string | null;
  serviceRequest?: { reference: string } | null;
  placedAt: string;
  paidAt: string | null;
  completedAt: string | null;
  reservationExpiresAt: string | null;
}

export interface AdminOrderDetail extends AdminOrder {
  items: { id: string; productName: string; variantName: string; sku: string; unitPrice: string; quantity: number; lineTotal: string; returnWindowDays: number }[];
  payments: { id: string; reference: string; provider: string; status: string; amount: string; currency: string; failureReason: string | null; verifiedAt: string | null; createdAt: string }[];
  history: { id: string; from: string | null; to: string; note: string | null; createdAt: string }[];
  allowedNext: string[];
}

export interface AdminVariant {
  id: string;
  name: string;
  sku: string;
  price: string | null;
  trackStock: boolean;
  stockOnHand: number;
  stockReserved: number;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  brand: string | null;
  attributes?: { specs?: { group?: string; name: string; value: string }[] } | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  basePrice: string;
  compareAtPrice: string | null;
  images: string[];
  isFeatured: boolean;
  pickupOnly: boolean;
  returnWindowDays: number | null;
  variants: AdminVariant[];
  category?: { name: string };
  updatedAt: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  returnWindowDays: number | null;
  imageUrl?: string | null;
}

export interface AdminZone {
  id: string;
  name: string;
  region: string;
  areas: string[];
  fee: string;
  minimumOrder: string | null;
  freeDeliveryThreshold: string | null;
  leadTime: string | null;
  serviceHours: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface StoreSettings {
  paymentWindowMinutes: number;
  returnWindowWorkingDays: number;
  pricesIncludeTax: boolean;
  serviceLeadDays: number;
  reviewsRequirePurchase: boolean;
  publicHolidays: string[];
  updatedAt: string;
}

export interface AdminTaxRate {
  id: string;
  name: string;
  rate: string;
  appliesToDelivery: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENT' | 'FIXED';
  value: string;
  maxDiscount: string | null;
  minimumSpend: string | null;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number | null;
  firstOrderOnly: boolean;
  productIds: string[];
  categoryIds: string[];
  isActive: boolean;
  createdAt: string;
}

export interface OutboxRow {
  id: string;
  channel: string;
  type: string;
  recipient: string;
  status: string;
  attempts: number;
  lastError: string | null;
  orderId: string | null;
  createdAt: string;
  nextAttemptAt: string;
}

const d = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const adminApi = {
  summary: () => d(api.get<Summary>('/admin/reports/summary')),

  orders: (params: Record<string, string | number | undefined>) => d(api.get<Paginated<AdminOrder>>('/admin/orders', { params })),
  order: (orderNumber: string) => d(api.get<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(orderNumber)}`)),
  setOrderStatus: (orderNumber: string, status: string, note?: string) => d(api.patch(`/admin/orders/${encodeURIComponent(orderNumber)}/status`, { status, note })),
  reconcile: (reference: string) => d(api.post<{ status: string }>(`/admin/payments/${encodeURIComponent(reference)}/reconcile`)),
  clearReconciliation: (orderNumber: string) => d(api.patch(`/admin/orders/${encodeURIComponent(orderNumber)}/reconciled`)),

  products: (params: Record<string, string | number | undefined>) => d(api.get<Paginated<AdminProduct>>('/admin/products', { params })),
  product: (id: string) => d(api.get<AdminProduct>(`/admin/products/${id}`)),
  createProduct: (body: unknown) => d(api.post<AdminProduct>('/admin/products', body)),
  updateProduct: (id: string, body: unknown) => d(api.patch<AdminProduct>(`/admin/products/${id}`, body)),
  addVariant: (productId: string, body: unknown) => d(api.post<AdminVariant>(`/admin/products/${productId}/variants`, body)),
  updateVariant: (variantId: string, body: unknown) => d(api.patch<AdminVariant>(`/admin/products/variants/${variantId}`, body)),
  adjustStock: (variantId: string, delta: number, note?: string) => d(api.post(`/admin/products/variants/${variantId}/stock`, { delta, note })),
  uploadImage: (file: File) => signedUpload<{ url: string }>(file, '/admin/uploads/signature', '/admin/uploads/confirm'),

  categories: () => d(api.get<AdminCategory[]>('/admin/categories')),
  createCategory: (body: unknown) => d(api.post<AdminCategory>('/admin/categories', body)),
  updateCategory: (id: string, body: unknown) => d(api.patch<AdminCategory>(`/admin/categories/${id}`, body)),

  zones: () => d(api.get<AdminZone[]>('/admin/delivery-zones')),
  createZone: (body: unknown) => d(api.post<AdminZone>('/admin/delivery-zones', body)),
  updateZone: (id: string, body: unknown) => d(api.patch<AdminZone>(`/admin/delivery-zones/${id}`, body)),

  settings: () => d(api.get<StoreSettings>('/admin/settings')),
  updateSettings: (body: Partial<StoreSettings>) => d(api.patch<StoreSettings>('/admin/settings', body)),
  taxRates: () => d(api.get<AdminTaxRate[]>('/admin/tax-rates')),
  createTaxRate: (body: unknown) => d(api.post<AdminTaxRate>('/admin/tax-rates', body)),
  updateTaxRate: (id: string, body: unknown) => d(api.patch<AdminTaxRate>(`/admin/tax-rates/${id}`, body)),

  staff: () => d(api.get<{ id: string; name: string; email: string; role: Role; createdAt: string }[]>('/admin/staff')),
  setRole: (email: string, role: Role) => d(api.patch('/admin/staff/role', { email, role })),

  coupons: () => d(api.get<AdminCoupon[]>('/admin/coupons')),
  createCoupon: (body: unknown) => d(api.post<AdminCoupon>('/admin/coupons', body)),
  updateCoupon: (id: string, body: unknown) => d(api.patch<AdminCoupon>(`/admin/coupons/${id}`, body)),

  notifications: (status?: string) => d(api.get<Paginated<OutboxRow>>('/admin/notifications', { params: { status, limit: 50 } })),
  retryNotification: (id: string) => d(api.post(`/admin/notifications/${id}/retry`)),
};

// ---------- helpers ----------
export const MONEY_RE = /^\d{1,10}(\.\d{1,2})?$/;

/** "15" or "2.5" (percent, as typed) -> "0.1500" / "0.0250" (fraction the API stores). */
export function percentToFraction(p: string): string | null {
  const n = Number(p);
  if (!Number.isFinite(n) || n < 0 || n > 100 || !/^\d{1,3}(\.\d{1,2})?$/.test(p.trim())) return null;
  return (Math.round(n * 100) / 10000).toFixed(4);
}

export const fractionToPercent = (f: string) => String(Math.round(Number(f) * 10000) / 100);

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
