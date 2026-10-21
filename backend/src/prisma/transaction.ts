import { Prisma } from '../generated/prisma/client';
import type { PrismaService } from './prisma.service';

export type Tx = Prisma.TransactionClient;

function isSerializationFailure(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (e.code === 'P2034') return true;
  const meta = e.meta as Record<string, unknown> | undefined;
  return e.code === 'P2010' && JSON.stringify(meta ?? {}).includes('40001');
}

/** Runs fn in a SERIALIZABLE transaction, retrying on serialization conflicts. */
export async function serializable<T>(
  prisma: PrismaService,
  fn: (tx: Tx) => Promise<T>,
  attempts = 3,
): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 15_000,
      });
    } catch (e) {
      if (i < attempts && isSerializationFailure(e)) {
        await new Promise((r) => setTimeout(r, 25 * i + Math.random() * 50));
        continue;
      }
      throw e;
    }
  }
}
