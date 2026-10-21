import { api } from './client';
import type { User } from '../types';

export const authApi = {
  session: () => api.get<{ user: User }>('/auth/session').then((r) => r.data.user),
  login: (email: string, password: string) => api.post<{ user: User }>('/auth/login', { email, password }).then((r) => r.data.user),
  register: (input: { name: string; email: string; password: string; phone?: string }) =>
    api.post<{ user: User }>('/auth/register', input).then((r) => r.data.user),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
};
