'use client';

import { useState } from 'react';
import { PageHeader, SaveStatus, Table } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { adminApi, type Role } from '@/lib/api/admin';
import { useLoad, useSaver } from '@/hooks/use-load';
import { useSession } from '@/stores/session-store';

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: 'FULFILMENT', label: 'Orders staff', hint: 'Sees orders and updates their status.' },
  { value: 'ADMIN', label: 'Admin', hint: 'Everything, including prices, tax and staff.' },
  { value: 'CUSTOMER', label: 'No staff access', hint: 'Removes access to the admin.' },
];
const label = (r: Role) => ROLES.find((x) => x.value === r)?.label ?? r.toLowerCase();

export default function StaffPage() {
  const me = useSession((s) => s.user);
  const staff = useLoad(() => adminApi.staff(), []);
  const saver = useSaver();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('FULFILMENT');

  const change = async (e: string, r: Role) => {
    if (await saver.run(() => adminApi.setRole(e, r), `${e} is now: ${label(r).toLowerCase()}. They need to sign in again.`)) {
      setEmail('');
      staff.reload();
    }
  };

  return (
    <>
      <PageHeader title="Staff" description="Ask the person to create an account on the shop first, then give them a role here using their email." />
      <form className="panel mb-6 flex flex-wrap items-end gap-3 p-5" onSubmit={(e) => { e.preventDefault(); if (email.trim()) change(email.trim(), role); }}>
        <div><label htmlFor="email" className="label">Their account email</label><input id="email" type="email" className="field w-72" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div>
          <label htmlFor="role" className="label">Role</label>
          <select id="role" className="field w-56" value={role} onChange={(e) => setRole(e.target.value as Role)} aria-describedby="role-hint">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={!email.trim() || saver.saving}>Give access</button>
        <p id="role-hint" className="w-full text-xs text-muted">{ROLES.find((r) => r.value === role)?.hint}</p>
      </form>
      <p className="mb-4"><SaveStatus status={saver.status} message={saver.message} /></p>

      {staff.error && <ErrorState message={staff.error.message} onRetry={staff.reload} />}
      {!staff.data && !staff.error && <Skeleton className="h-40" />}
      {staff.data && (
        <Table caption="Staff accounts">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th /></tr></thead>
          <tbody>
            {staff.data.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{label(u.role)}</td>
                <td className="text-right">
                  {u.id !== me?.id && (
                    <button type="button" className="text-sm text-danger underline" disabled={saver.saving} onClick={() => change(u.email, 'CUSTOMER')}>Remove access</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
