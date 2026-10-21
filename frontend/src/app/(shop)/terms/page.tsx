import type { Metadata } from 'next';
import { PolicyPage } from '@/components/support/PolicyPage';

export const metadata: Metadata = { title: 'Terms of sale' };

// Replace with the owner-approved policy text (SRS 12: review with local advisers before launch).
export default function Page() {
  return <PolicyPage title="Terms of sale" />;
}
