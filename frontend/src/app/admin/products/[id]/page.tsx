'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/product/ProductForm';
import { VariantsEditor } from '@/components/admin/product/VariantsEditor';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { adminApi } from '@/lib/api/admin';
import { useLoad } from '@/hooks/use-load';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, error, reload } = useLoad(() => adminApi.product(id), [id]);

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!product) return <Skeleton className="h-96" />;

  return (
    <>
      <Link href="/admin/products" className="text-sm underline underline-offset-2">All products</Link>
      <PageHeader
        title={product.name}
        actions={
          <>
            <StatusBadge status={product.status} />
            {product.status === 'PUBLISHED' && <Link href={`/products/${product.slug}`} target="_blank" className="btn btn-secondary">View in shop</Link>}
          </>
        }
      />
      <div className="space-y-8">
        <VariantsEditor product={product} onChange={reload} />
        <ProductForm key={product.updatedAt} product={product} onSaved={() => reload()} />
      </div>
    </>
  );
}
