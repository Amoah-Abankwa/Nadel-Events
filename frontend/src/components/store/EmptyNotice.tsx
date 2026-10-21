import Link from 'next/link';

/** Plain empty state from the reference: one line, then a "Continue" button on the right. */
export function EmptyNotice({ text, href = '/', label = 'Continue' }: { text: string; href?: string; label?: string }) {
  return (
    <div>
      <p className="text-[15px]">{text}</p>
      <div className="mt-4 flex justify-end"><Link href={href} className="btn btn-primary">{label}</Link></div>
    </div>
  );
}
