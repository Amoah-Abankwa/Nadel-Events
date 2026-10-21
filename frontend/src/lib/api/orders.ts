import { api } from './client';
import type { CartLineInput, OrderDetail, OrderStatusView, OrderSummary, Paginated } from '../types';

export const ordersApi = {
  mine: (page = 1) => api.get<Paginated<OrderSummary>>('/me/orders', { params: { page, limit: 20 } }).then((r) => r.data),
  detail: (orderNumber: string) => api.get<OrderDetail>(`/me/orders/${encodeURIComponent(orderNumber)}`).then((r) => r.data),
  status: (orderNumber: string) => api.get<OrderStatusView>(`/orders/${encodeURIComponent(orderNumber)}/status`).then((r) => r.data),
  cancel: (orderNumber: string) => api.post(`/orders/${encodeURIComponent(orderNumber)}/cancel`).then((r) => r.data),
  reorder: (orderNumber: string) =>
    api.post<{ lines: CartLineInput[]; skipped: number }>(`/orders/${encodeURIComponent(orderNumber)}/reorder`).then((r) => r.data),
  pay: (orderNumber: string) =>
    api.post<{ reference: string; checkoutUrl: string }>('/payments/initiate', { orderNumber }).then((r) => r.data),
  mockComplete: (reference: string, outcome: 'SUCCEEDED' | 'FAILED') =>
    api.post<{ status: string; orderNumber: string }>(`/payments/mock/${encodeURIComponent(reference)}/complete`, { outcome }).then((r) => r.data),
};
