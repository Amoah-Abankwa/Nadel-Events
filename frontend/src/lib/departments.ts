import type { Category } from './types';

/**
 * The store's three departments, recognised by category slug so renaming a category
 * doesn't break navigation. One definition for the main shop, cake shop and decoration studio.
 */
export const DEPARTMENTS = {
  cakes: { match: /cake|pastr/, home: '/cakes', label: 'Cakes' },
  decor: { match: /decor|party/, home: '/decor', label: 'Decoration' },
  kitchen: { match: /kitchen|cookware/, home: null, label: 'Kitchenware' },
} as const;

export type Department = keyof typeof DEPARTMENTS;

export function findDepartment(categories: Category[], dept: Department): Category | undefined {
  return categories.find((c) => DEPARTMENTS[dept].match.test(c.slug));
}

/** A category and all of its descendants, depth-first. */
export function flattenCategory(c: Category): Category[] {
  return [c, ...c.children.flatMap(flattenCategory)];
}

export function flattenAll(categories: Category[]): Category[] {
  return categories.flatMap(flattenCategory);
}

/** Is `slug` inside the department's category tree? */
export function inDepartment(categories: Category[], dept: Department, slug: string): boolean {
  const root = findDepartment(categories, dept);
  return Boolean(root && flattenCategory(root).some((c) => c.slug === slug));
}

/** Where a department's menu link should go: its own section home, else its category page. */
export function departmentHref(dept: Department, category?: Category): string {
  return DEPARTMENTS[dept].home ?? (category ? `/categories/${category.slug}` : '/shop');
}
