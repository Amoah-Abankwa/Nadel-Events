import { api } from './client';
import type { Address } from '../types';

export interface SavedAddress extends Address {
  id: string;
  isDefault: boolean;
}

export interface WishlistEntry {
  id: string;
  slug: string;
  name: string;
  images: string[];
  basePrice: string;
  addedAt: string;
}

const d = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const accountApi = {
  profile: () => d(api.get<{ id: string; email: string; name: string; phone: string | null }>('/me')),
  updateProfile: (body: { name?: string; phone?: string }) => d(api.patch('/me', body)),
  changePassword: (currentPassword: string, newPassword: string) => d(api.post('/auth/change-password', { currentPassword, newPassword })),
  deleteAccount: (password: string) => d(api.post('/auth/delete-account', { password })),
  exportData: () => d(api.get<unknown>('/me/export')),

  addresses: () => d(api.get<SavedAddress[]>('/me/addresses')),
  addAddress: (a: Address & { isDefault?: boolean }) => d(api.post<SavedAddress>('/me/addresses', a)),
  updateAddress: (id: string, a: Partial<Address> & { isDefault?: boolean }) => d(api.patch<SavedAddress>(`/me/addresses/${id}`, a)),
  deleteAddress: (id: string) => d(api.delete(`/me/addresses/${id}`)),

  wishlist: () => d(api.get<WishlistEntry[]>('/me/wishlist')),
  addWish: (productId: string) => d(api.post(`/me/wishlist/${productId}`)),
  removeWish: (productId: string) => d(api.delete(`/me/wishlist/${productId}`)),
};
