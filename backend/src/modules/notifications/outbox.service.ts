import { Injectable } from '@nestjs/common';
import type { OutboxChannel, Prisma } from '../../generated/prisma/client';
import type { Tx } from '../../prisma/transaction';
import type { PrismaService } from '../../prisma/prisma.service';

export interface OutboxMessage {
  channel: OutboxChannel;
  type: string;
  recipient: string;
  payload: Prisma.InputJsonValue;
  /** Same key = same message. Duplicate enqueues are silently ignored. */
  idempotencyKey: string;
  orderId?: string;
}

/**
 * Writes notifications in the same transaction as the business change (transactional outbox).
 * Order creation never depends on email/WhatsApp provider uptime (SRS 10.4).
 */
@Injectable()
export class OutboxService {
  async enqueue(db: Tx | PrismaService, messages: OutboxMessage[]) {
    if (!messages.length) return;
    await db.outboxEvent.createMany({ data: messages, skipDuplicates: true });
  }
}
