/**
 * Listing options shared by server and client code. Kept out of 'use client' files on purpose:
 * a Server Component that imports a plain value from a client file gets a reference, not the value.
 */
export const PAGE_SIZES = [12, 24, 48] as const;