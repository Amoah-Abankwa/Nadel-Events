import type { Metadata } from 'next';
import { PolicyPage } from '@/components/support/PolicyPage';

export const metadata: Metadata = { title: 'Privacy policy' };

// Replace with the owner-approved policy text (SRS 12: review with local advisers before launch).
export default function Page() {
  return <PolicyPage title="Privacy policy" />;
}
