'use client';

import { useMemo } from 'react';
import { adminApi, type AdminCategory } from '@/lib/api/admin';
import { useLoad } from '@/hooks/use-load';

/** Categories as "Parent › Child" options, plus each one's effective returns window. */
export function useCategoryOptions() {
  const cats = useLoad(() => adminApi.categories(), []);
  const settings = useLoad(() => adminApi.settings(), []);

  return useMemo(() => {
    const list = cats.data ?? [];
    const byId = new Map(list.map((c) => [c.id, c]));
    const path = (c: AdminCategory): string => (c.parentId && byId.get(c.parentId) ? `${path(byId.get(c.parentId)!)} › ${c.name}` : c.name);
    const effective = (id: string): number => {
      let c = byId.get(id);
      for (let i = 0; c && i < 20; i++) {
        if (c.returnWindowDays != null) return c.returnWindowDays;
        c = c.parentId ? byId.get(c.parentId) : undefined;
      }
      return settings.data?.returnWindowWorkingDays ?? 3;
    };
    const options = list.map((c) => ({ id: c.id, label: path(c), active: c.isActive })).sort((a, b) => a.label.localeCompare(b.label));
    return { options, effective, loading: cats.loading };
  }, [cats.data, cats.loading, settings.data]);
}

export const describeReturns = (days: number) => (days === 0 ? 'not returnable' : `${days} working ${days === 1 ? 'day' : 'days'}`);
