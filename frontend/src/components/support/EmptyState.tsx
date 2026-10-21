import Link from 'next/link';

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: { href: string; label: string } }) {
  return (
    <div className="panel px-6 py-14 text-center">
      <h2 className="text-2xl">{title}</h2>
      {body && <p className="mx-auto mt-2 max-w-md text-muted">{body}</p>}
      {action && <Link href={action.href} className="btn btn-primary mt-6">{action.label}</Link>}
    </div>
  );
}
