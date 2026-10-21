import Link from 'next/link';

export function Pagination({ page, totalPages, basePath, params }: { page: number; totalPages: number; basePath: string; params: Record<string, string | undefined> }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
    q.set('page', String(p));
    return `${basePath}?${q.toString()}`;
  };
  return (
    <nav aria-label="Pagination" className="flex items-center gap-4 text-sm">
      {page > 1 ? <Link href={href(page - 1)} className="btn btn-secondary">Previous</Link> : <span />}
      <span aria-current="page">Page {page} of {totalPages}</span>
      {page < totalPages ? <Link href={href(page + 1)} className="btn btn-secondary">Next</Link> : <span />}
    </nav>
  );
}
