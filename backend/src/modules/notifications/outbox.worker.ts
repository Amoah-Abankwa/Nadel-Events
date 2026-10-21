import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import type { OutboxEvent } from '../../generated/prisma/client';
import { EmailSender } from './email.sender';
import { templates, TemplateType } from './templates/email-templates';

const BATCH = 20;
const MAX_ATTEMPTS = 8;
const STUCK_AFTER_MS = 5 * 60_000;

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailSender,
  ) {}

  @Interval(10_000)
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.reclaimStuck();
      const batch = await this.claim();
      for (const event of batch) await this.process(event);
    } catch (e) {
      this.logger.error(e);
    } finally {
      this.running = false;
    }
  }

  /** SKIP LOCKED lets several API instances share the queue safely. */
  private claim() {
    return this.prisma.$queryRaw<OutboxEvent[]>`
      UPDATE "OutboxEvent" SET status = 'PROCESSING', "lockedAt" = now()
      WHERE id IN (
        SELECT id FROM "OutboxEvent"
        WHERE status = 'PENDING' AND "nextAttemptAt" <= now()
        ORDER BY "createdAt"
        LIMIT ${BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *`;
  }

  private reclaimStuck() {
    return this.prisma.outboxEvent.updateMany({
      where: { status: 'PROCESSING', lockedAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) } },
      data: { status: 'PENDING', lockedAt: null },
    });
  }

  private async process(event: OutboxEvent) {
    try {
      await this.deliver(event);
      await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { status: 'SENT', sentAt: new Date(), lockedAt: null, lastError: null } });
    } catch (e) {
      const attempts = event.attempts + 1;
      const dead = attempts >= MAX_ATTEMPTS;
      const delayMs = Math.min(2 ** attempts * 30_000, 60 * 60_000);
      const message = e instanceof Error ? e.message : String(e);
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: dead ? 'DEAD' : 'PENDING', attempts, lockedAt: null, lastError: message.slice(0, 1000), nextAttemptAt: new Date(Date.now() + delayMs) },
      });
      // Dead events are listed at GET /admin/notifications?status=DEAD (SRS 14.2).
      if (dead) this.logger.error(`Outbox event ${event.id} (${event.type}) is dead after ${attempts} attempts: ${message}`);
      else this.logger.warn(`Outbox event ${event.id} failed (attempt ${attempts}): ${message}`);
    }
  }

  private async deliver(event: OutboxEvent) {
    if (event.channel === 'WHATSAPP') {
      throw new Error('WhatsApp Business provider is not configured');
    }
    const render = templates[event.type as TemplateType] as ((p: unknown) => { subject: string; html: string; text: string }) | undefined;
    if (!render) throw new Error(`Unknown email template ${event.type}`);
    await this.email.send({ to: event.recipient, ...render(event.payload) });
  }
}
