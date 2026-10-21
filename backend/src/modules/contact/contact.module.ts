import { Body, Controller, Get, HttpCode, Injectable, Module, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import type { Request } from 'express';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { PageQuery, paginate } from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../notifications/outbox.service';
import { PHONE_MESSAGE, PHONE_RE, trim } from '../../common/validation';

export const TOPICS = ['ORDER', 'CUSTOM_CAKE', 'DELIVERY', 'PRODUCT', 'OTHER'] as const;

class ContactDto {
  @Transform(trim) @IsString() @Length(2, 80, { message: 'Enter your name' })
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)) @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @IsOptional() @Transform(trim) @Matches(PHONE_RE, { message: PHONE_MESSAGE })
  phone?: string;

  @IsIn(TOPICS)
  topic: (typeof TOPICS)[number];

  @IsOptional() @Transform(trim) @IsString() @MaxLength(40)
  orderNumber?: string;

  @Transform(trim) @IsString() @Length(10, 3000, { message: 'Tell us a bit more (at least 10 characters)' })
  message: string;

  /** Honeypot: hidden from people, filled in by bots. */
  @IsOptional() @IsString() @MaxLength(200)
  website?: string;
}

class MessageQuery extends PageQuery {
  @IsOptional() @IsIn(['NEW', 'HANDLED'])
  status?: 'NEW' | 'HANDLED';
}

class MessageStatusDto {
  @IsIn(['NEW', 'HANDLED'])
  status: 'NEW' | 'HANDLED';
}

const TOPIC_LABEL: Record<string, string> = { ORDER: 'An order', CUSTOM_CAKE: 'A custom cake or event', DELIVERY: 'Delivery', PRODUCT: 'A product', OTHER: 'Something else' };

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<Env, true>,
    private readonly audit: AuditService,
  ) {}

  async create(dto: ContactDto) {
    if (dto.website) return { ok: true }; // bot: pretend success, store nothing
    const msg = await this.prisma.contactMessage.create({
      data: { name: dto.name, email: dto.email, phone: dto.phone || null, topic: dto.topic, orderNumber: dto.orderNumber || null, message: dto.message },
    });
    const owner = this.config.get('OWNER_EMAIL', { infer: true });
    if (owner) {
      await this.outbox.enqueue(this.prisma, [{
        channel: 'EMAIL',
        type: 'CONTACT_MESSAGE',
        recipient: owner,
        idempotencyKey: `contact:${msg.id}`,
        payload: {
          storeName: this.config.get('STORE_NAME', { infer: true }),
          name: msg.name, email: msg.email, phone: msg.phone, topic: TOPIC_LABEL[msg.topic] ?? msg.topic, orderNumber: msg.orderNumber, message: msg.message,
          adminUrl: `${this.config.get('WEB_URL', { infer: true })}/admin/messages`,
        },
      }]);
    }
    return { ok: true };
  }

  async list(q: MessageQuery) {
    const where = q.status ? { status: q.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      this.prisma.contactMessage.count({ where }),
    ]);
    return paginate(items, total, q);
  }

  async setStatus(id: string, status: 'NEW' | 'HANDLED', actorId: string, requestId?: string) {
    const found = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!found) throw new NotFoundException();
    const m = await this.prisma.contactMessage.update({ where: { id }, data: { status, handledBy: status === 'HANDLED' ? actorId : null, handledAt: status === 'HANDLED' ? new Date() : null } });
    await this.audit.record({ actorId, requestId, action: 'contact.status', resourceType: 'ContactMessage', resourceId: id, after: { status } });
    return m;
  }

  countNew() {
    return this.prisma.contactMessage.count({ where: { status: 'NEW' } });
  }
}

@Controller()
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public() @Throttle({ default: { limit: 5, ttl: 3_600_000 } }) @HttpCode(200) @Post('contact')
  create(@Body() dto: ContactDto) {
    return this.contact.create(dto);
  }

  @Roles('FULFILMENT') @Get('admin/messages')
  list(@Query() q: MessageQuery) {
    return this.contact.list(q);
  }

  @Roles('FULFILMENT') @Patch('admin/messages/:id')
  status(@Param('id') id: string, @Body() dto: MessageStatusDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.contact.setStatus(id, dto.status, user.id, req.requestId);
  }
}

@Module({ controllers: [ContactController], providers: [ContactService], exports: [ContactService] })
export class ContactModule {}
