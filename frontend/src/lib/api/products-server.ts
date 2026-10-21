import 'server-only';
import { notFound } from 'next/navigation';
import type { ProductDetail } from '../types';
import { ApiError } from './errors';
import { serverGet } from './server';

/** Load a published product for any section's product page; unknown slugs show the 404 page. */
export async function getProductOrNotFound(slug: string): Promise<ProductDetail> {
  try {
    return await serverGet<ProductDetail>(`/products/${encodeURIComponent(slug)}`, 30);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}
