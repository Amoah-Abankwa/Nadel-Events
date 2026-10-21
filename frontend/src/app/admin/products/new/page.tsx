'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/product/ProductForm';

export default function NewProductPage() {
  return (
    <>
      <Link href="/admin/products" className="text-sm underline underline-offset-2">All products</Link>
      <PageHeader title="Add product" description="New products start as drafts. Publish when the photos and price are ready." />
      <ProductForm />
    </>
  );
}
