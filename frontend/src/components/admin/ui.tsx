'use client';

import Link from 'next/link';
import { ORDER_STATUS_LABEL } from '@/lib/format';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ id, label, hint, error, children, className = '' }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Toggle({ id, label, checked, onChange, disabled }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label htmlFor={id} className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm">
      <input id={id} type="checkbox" className="size-4 accent-burgundy" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      {label}
    </label>
  );
}

export function SaveStatus({ status, message }: { status: string; message?: string }) {
  return (
    <span aria-live="polite" className={`text-sm ${status === 'error' ? 'text-danger' : status === 'saved' ? 'text-success' : 'text-muted'}`}>
      {status === 'saving' ? 'Saving…' : status === 'idle' ? '' : message}
    </span>
  );
}

const TONE: Record<string, string> = {
  PENDING_PAYMENT: 'bg-flour text-cocoa',
  PAID: 'bg-burgundy text-paper',
  PROCESSING: 'bg-cocoa text-paper',
  READY_FOR_PICKUP: 'bg-success text-paper',
  OUT_FOR_DELIVERY: 'bg-success text-paper',
  COMPLETED: 'border border-success text-success',
  DELIVERY_EXCEPTION: 'bg-danger text-paper',
  PAYMENT_FAILED: 'border border-crust text-muted',
  CANCELLED: 'border border-crust text-muted',
  EXPIRED: 'border border-crust text-muted',
  REFUND_PENDING: 'border border-danger text-danger',
  DRAFT: 'bg-flour text-cocoa',
  PUBLISHED: 'bg-success text-paper',
  ARCHIVED: 'border border-crust text-muted',
  DEAD: 'bg-danger text-paper',
  SENT: 'border border-success text-success',
  PENDING: 'bg-flour text-cocoa',
};

export function StatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABEL[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
  return <span className={`inline-block whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold ${TONE[status] ?? 'bg-flour text-cocoa'}`}>{label}</span>;
}

export function Table({ children, caption }: { children: React.ReactNode; caption: string }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-left text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-muted [&_thead]:border-b [&_thead]:border-flour [&_tbody_tr]:border-b [&_tbody_tr]:border-flour [&_tbody_tr:last-child]:border-0">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center gap-3 text-sm">
      <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {page} of {totalPages}</span>
      <button type="button" className="btn btn-secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}

export function LinkButton({ href, children, primary }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return <Link href={href} className={`btn ${primary ? 'btn-primary' : 'btn-secondary'}`}>{children}</Link>;
}
