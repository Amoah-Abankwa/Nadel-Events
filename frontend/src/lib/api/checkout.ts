import { api } from './client';
import type { ProductCard, Address, CartLineInput, CreateOrderResult, DeliveryZone, FulfilmentType, PublicSettings, Quote, ValidatedLine } from '../types';

export interface QuoteInput {
  lines: CartLineInput[];
  fulfilmentType: FulfilmentType;
  deliveryRegion?: string;
  deliveryArea?: string;
  couponCode?: string;
}

export interface CreateOrderInput extends QuoteInput {
  checkoutKey: string;
  contactPhone: string;
  address?: Address;
  notes?: string;
  acceptTerms: boolean;
}

export interface CartEstimate extends Quote {
  fulfilmentType: FulfilmentType;
  couponError: string | null;
  deliveryError: string | null;
}

export const checkoutApi = {
  estimate: (input: { lines: CartLineInput[]; couponCode?: string; deliveryRegion?: string; deliveryArea?: string }) =>
    api.post<CartEstimate>('/cart/estimate', input).then((r) => r.data),
  recommendations: (ids: string[], limit = 8) =>
    api.get<ProductCard[]>('/products/recommendations', { params: { ids: ids.join(','), limit } }).then((r) => r.data),
  validateCart: (lines: CartLineInput[]) => api.post<{ lines: ValidatedLine[] }>('/cart/validate', { lines }).then((r) => r.data.lines),
  deliveryZones: () => api.get<DeliveryZone[]>('/delivery/zones').then((r) => r.data),
  settings: () => api.get<PublicSettings>('/settings').then((r) => r.data),
  quote: (input: QuoteInput) => api.post<Quote>('/checkout/quote', input).then((r) => r.data),
  createOrder: (input: CreateOrderInput) => api.post<CreateOrderResult>('/checkout/orders', input).then((r) => r.data),
};
