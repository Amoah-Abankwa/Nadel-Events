import { api } from './client';

export interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface ReviewPage {
  summary: { average: number | null; count: number; distribution: { star: number; count: number }[] };
  requirePurchase: boolean;
  canReview: boolean;
  mine: { rating: number; title: string | null; body: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' } | null;
  items: ReviewItem[];
  page: number;
  totalPages: number;
  total: number;
}

export interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verifiedPurchase: boolean;
  createdAt: string;
  user: { name: string; email: string };
  product: { name: string; slug: string };
}

const d = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const reviewsApi = {
  list: (slug: string, page = 1) => d(api.get<ReviewPage>(`/products/${encodeURIComponent(slug)}/reviews`, { params: { page, limit: 10 } })),
  save: (slug: string, body: { rating: number; title?: string; body: string }) => d(api.put(`/products/${encodeURIComponent(slug)}/reviews/mine`, body)),
  adminList: (status?: string, page = 1) => d(api.get<{ items: AdminReview[]; page: number; totalPages: number }>('/admin/reviews', { params: { status, page, limit: 25 } })),
  moderate: (id: string, status: 'APPROVED' | 'REJECTED') => d(api.patch(`/admin/reviews/${id}`, { status })),
};
