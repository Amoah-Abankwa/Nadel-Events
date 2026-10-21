import { createHash, randomBytes, randomInt } from 'node:crypto';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I

export function orderNumber(now = new Date()): string {
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, '');
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `CK-${ymd}-${suffix}`;
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
