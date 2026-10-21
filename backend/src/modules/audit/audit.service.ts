import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Tx } from '../../prisma/transaction';

const REDACT = /password|token|secret|hash|card|cvv/i;

function redact(value: unknown): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return JSON.parse(
    JSON.stringify(value, (k, v) => (k && REDACT.test(k) ? '[redacted]' : v)),
  ) as Prisma.InputJsonValue;
}

export interface AuditInput {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  requestId?: string;
  before?: unknown;
  after?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: AuditInput, tx?: Tx) {
    const db = tx ?? this.prisma;
    return db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        requestId: input.requestId,
        before: redact(input.before),
        after: redact(input.after),
      },
    });
  }
}
