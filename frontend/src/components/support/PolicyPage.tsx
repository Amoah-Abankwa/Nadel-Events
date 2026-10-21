export function PolicyPage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <article className="max-w-prose">
      <h1 className="text-4xl">{title}</h1>
      <div className="mt-6 space-y-4 leading-relaxed">
        {children ?? <p className="text-muted">This policy is being finalised. Contact us on WhatsApp if you have a question in the meantime.</p>}
      </div>
    </article>
  );
}
