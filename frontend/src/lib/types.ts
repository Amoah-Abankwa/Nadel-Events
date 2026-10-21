// Mirrors the API contracts. Move to a shared package when the monorepo grows.

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  images: string[];
  category: { slug: string; name: string };
  price: string;
  hasPriceRange: boolean;
  compareAtPrice: string | null;
  inStock: boolean;
  defaultVariantId: string | null;
  pickupOnly: boolean;
  rating?: { average: number; count: number } | null;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: string;
  inStock: boolean;
  lowStock: boolean;
  maxQuantity: number;
}

export interface SpecRow {
  group?: string;
  name: string;
  value: string;
}

export interface ProductDetail extends ProductCard {
  description: string;
  brand?: string | null;
  attributes?: { specs?: SpecRow[] } | null;
  /** Effective returns window in working days; 0 = not returnable. */
  returnWindowDays: number;
  variants: ProductVariant[];
  related: ProductCard[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  /** Effective returns window in working days; 0 = not returnable. */
  returnWindowDays: number;
  children: Category[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'CUSTOMER' | 'FULFILMENT' | 'MARKETING' | 'ADMIN';
}

export type FulfilmentType = 'PICKUP' | 'DELIVERY';

export interface CartLineInput {
  variantId: string;
  quantity: number;
}

export interface ValidatedLine {
  variantId: string;
  status: 'OK' | 'QUANTITY_REDUCED' | 'OUT_OF_STOCK' | 'UNAVAILABLE';
  quantity: number;
  maxQuantity?: number;
  unitPrice?: string;
  productName?: string;
  variantName?: string;
  slug?: string;
  image?: string | null;
  productId?: string;
  pickupOnly?: boolean;
}

export interface DeliveryZone {
  zone: string;
  region: string;
  /** Empty = the region-wide rate. */
  areas: string[];
  leadTime: string | null;
  fee: string;
  minimumOrder: string | null;
  freeDeliveryThreshold: string | null;
  serviceHours: string | null;
}

export interface TaxLine {
  name: string;
  ratePercent: string;
  amount: string;
}

export interface PublicSettings {
  currency: string;
  paymentWindowMinutes: number;
  returnWindowWorkingDays: number;
  pricesIncludeTax: boolean;
  taxes: { name: string; ratePercent: string }[];
}

export interface Quote {
  lines: { variantId: string; unitPrice: string; quantity: number; lineTotal: string }[];
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  taxLines: TaxLine[];
  pricesIncludeTax: boolean;
  deliveryFee: string;
  total: string;
  couponCode: string | null;
  freeDeliveryApplied: boolean;
  amountToFreeDelivery: string | null;
  currency: string;
  deliveryZone: string | null;
  deliveryLeadTime: string | null;
}

export interface Address {
  recipientName: string;
  phone: string;
  addressLine: string;
  region: string;
  area: string;
  city: string;
  deliveryInstructions?: string;
}

export interface CreateOrderResult {
  orderNumber: string;
  total: string;
  currency: string;
  payment: { reference: string; checkoutUrl: string } | null;
  paymentError?: string;
}

export interface OrderStatusView {
  orderNumber: string;
  /** Set when this order is the deposit for a custom-cake/event request. */
  serviceRequestReference: string | null;
  status: string;
  paymentStatus: string;
  fulfilmentType: FulfilmentType;
  total: string;
  currency: string;
  reservationExpiresAt: string | null;
}

export interface OrderSummary extends OrderStatusView {
  placedAt: string;
  itemCount: number;
  firstItemName: string | null;
}

export interface OrderDetail extends OrderStatusView {
  placedAt: string;
  paidAt: string | null;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  taxLines: TaxLine[];
  pricesIncludeTax: boolean;
  deliveryFee: string;
  couponCode: string | null;
  completedAt: string | null;
  deliveryZoneName: string | null;
  shippingAddress: Address | null;
  contactPhone: string;
  notes: string | null;
  items: {
    productName: string;
    variantName: string;
    sku: string;
    imageUrl: string | null;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
    returnWindowDays: number;
    returnDeadline: string | null;
    returnable: boolean;
  }[];
  history: { status: string; at: string }[];
}
