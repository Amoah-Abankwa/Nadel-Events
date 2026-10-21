import { api } from './client';
import type { Paginated } from '../types';
import { signedUpload } from '../cloudinary';

export type RequestStatus = 'SUBMITTED' | 'QUOTED' | 'ACCEPTED' | 'CONFIRMED' | 'DECLINED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
export type FulfilmentPreference = 'PICKUP' | 'DELIVERY' | 'ON_SITE';

export interface ServiceOption {
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
}

export interface ServiceRequestView {
  reference: string;
  status: RequestStatus;
  service: { slug: string; name: string };
  eventDate: string;
  guestCount: number | null;
  budget: string | null;
  fulfilmentPreference: FulfilmentPreference;
  location: string | null;
  notes: string;
  contactPhone: string;
  images: string[];
  imageCount: number;
  quote: { amount: string; deposit: string; balance: string; validUntil: string | null; note: string | null; quotedAt: string; expired: boolean } | null;
  acceptedAt: string | null;
  depositPaidAt: string | null;
  closedReason: string | null;
  createdAt: string;
  depositOrder: { orderNumber: string; status: string; paymentStatus: string } | null;
  actions: { accept: boolean; decline: boolean; payDeposit: boolean; cancel: boolean };
}

export interface StaffRequestView extends ServiceRequestView {
  customer: { name: string; email: string; phone: string | null };
  staffNotes: string | null;
  orders: { orderNumber: string; status: string; paymentStatus: string; total: string; placedAt: string; needsReconciliation: boolean }[];
  staffActions: { quote: boolean; reject: boolean; complete: boolean; cancel: boolean };
}

export interface CreateRequestInput {
  service: string;
  eventDate: string;
  guestCount?: number;
  budget?: string;
  fulfilmentPreference: FulfilmentPreference;
  location?: string;
  notes: string;
  referenceImages: string[];
  contactPhone: string;
}

type Pay = { reference: string; checkoutUrl: string };
const d = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const requestsApi = {
  services: () => d(api.get<{ leadDays: number; services: ServiceOption[] }>('/services')),
  upload: (file: File) => signedUpload<{ path: string; previewUrl: string }>(file, '/service-requests/uploads/signature', '/service-requests/uploads/confirm'),
  create: (input: CreateRequestInput) => d(api.post<{ reference: string }>('/service-requests', input)),
  mine: () => d(api.get<Paginated<ServiceRequestView>>('/me/service-requests', { params: { limit: 50 } })),
  one: (ref: string) => d(api.get<ServiceRequestView>(`/me/service-requests/${encodeURIComponent(ref)}`)),
  accept: (ref: string) => d(api.post<{ status: RequestStatus; payment?: Pay; paymentError?: string }>(`/me/service-requests/${encodeURIComponent(ref)}/accept`)),
  payDeposit: (ref: string) => d(api.post<Pay>(`/me/service-requests/${encodeURIComponent(ref)}/pay-deposit`)),
  decline: (ref: string, reason?: string) => d(api.post(`/me/service-requests/${encodeURIComponent(ref)}/decline`, { reason })),
  cancel: (ref: string, reason?: string) => d(api.post(`/me/service-requests/${encodeURIComponent(ref)}/cancel`, { reason })),

  // staff
  adminList: (params: Record<string, string | number | undefined>) => d(api.get<Paginated<StaffRequestView>>('/admin/service-requests', { params })),
  adminGet: (ref: string) => d(api.get<StaffRequestView>(`/admin/service-requests/${encodeURIComponent(ref)}`)),
  quote: (ref: string, body: { quoteAmount: string; depositAmount: string; quoteValidUntil: string; quoteNote?: string }) =>
    d(api.post(`/admin/service-requests/${encodeURIComponent(ref)}/quote`, body)),
  setStatus: (ref: string, status: 'REJECTED' | 'COMPLETED' | 'CANCELLED', reason?: string) =>
    d(api.post<{ status: string; refundNeeded?: boolean }>(`/admin/service-requests/${encodeURIComponent(ref)}/status`, { status, reason })),
  saveNotes: (ref: string, staffNotes: string) => d(api.patch(`/admin/service-requests/${encodeURIComponent(ref)}/notes`, { staffNotes })),
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  SUBMITTED: 'Waiting for a quote',
  QUOTED: 'Quote ready',
  ACCEPTED: 'Deposit due',
  CONFIRMED: 'Booked',
  DECLINED: 'Quote declined',
  REJECTED: 'Not available',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const FULFILMENT_LABEL: Record<FulfilmentPreference, string> = {
  PICKUP: 'I’ll pick it up',
  DELIVERY: 'Deliver it to the venue',
  ON_SITE: 'Set up at the venue',
};
