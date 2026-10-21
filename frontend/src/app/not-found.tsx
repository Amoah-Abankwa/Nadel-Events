import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-4xl">We can’t find that page</h1>
      <p className="mt-3 text-muted">It may have moved, or the product may no longer be available.</p>
      <Link href="/shop" className="btn btn-primary mt-8">Go to the shop</Link>
    </main>
  );
}
